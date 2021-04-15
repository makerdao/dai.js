import { LINK, DAI, ServiceRoles } from '@makerdao/dai-plugin-mcd';
import { mineBlocks } from '../../test-helpers/src';
import BigNumber from 'bignumber.js';

const ilk = '0x4c494e4b2d41';

async function getPrice(maker) {
  const cdpType = maker
    .service(ServiceRoles.CDP_TYPE)
    .getCdpType(null, 'LINK-A');
  console.log('LINK PRICE:', cdpType.price._amount);
}

async function setProxyAndAllowances(maker) {
  const kprAddress = maker.currentAddress();
  const linkToken = await maker.getToken(LINK);

  await maker.service('proxy').ensureProxy();
  const proxyAddress = await maker.service('proxy').getProxyAddress();
  console.log('Proxy Address: ', proxyAddress);

  const linkAllowance = await linkToken.allowance(kprAddress, proxyAddress);
  if (Number(linkAllowance._amount) === 0) {
    await linkToken.approveUnlimited(proxyAddress);
  }
}

async function openVaultAndLock(maker, linkAmt) {
  const manager = maker.service('mcd:cdpManager');
  // open vault
  const vault = await manager.open('LINK-A');
  const vaultId = vault.id;
  console.log('Vault ID', vaultId);
  // lock collateral
  console.log(`Locking ${linkAmt} LINK-A`);
  try {
    await manager.lock(vault.id, 'LINK-A', LINK(linkAmt));
  } catch (e) {
    console.error('lock error:', e);
  }

  return vault;
}

async function resetVaultStats(vault) {
  vault.reset();
  await vault.prefetch();
}

async function drawDai(manager, managedVault, vaultId) {
  const percent = 0.985;
  const amtDai = await managedVault.daiAvailable._amount;
  console.log(
    `Drawing ${amtDai.times(percent).toFixed(17)} from Vault #${vaultId}`
  );
  try {
    let drawDai = await manager.draw(
      vaultId,
      'LINK-A',
      DAI(amtDai.times(percent).toFixed(17))
    );
    drawDai;
  } catch (error) {
    console.error(error);
  }
}

// MAIN
export async function createVaults(maker, network = 'testchain') {
  BigNumber.config({ ROUNDING_MODE: 1 }); //rounds down
  const me = maker.currentAddress();
  const manager = maker.service('mcd:cdpManager');
  const jug = maker.service('smartContract').getContract('MCD_JUG');
  const linkAmt = network === 'testchain' ? '25' : '5';

  await getPrice(maker);

  const linkToken = await maker.getToken(LINK);
  console.log('Link Balance:', (await linkToken.balanceOf(me)).toString());

  // Initial Setup
  if (network === 'testchain') await setProxyAndAllowances(maker); //not needed for kovan

  // Open a Vault and lock LINK
  const vault = await openVaultAndLock(maker, linkAmt);
  const vaultId = vault.id;

  let managedVault = await manager.getCdp(vaultId);
  const vaultUrnAddr = await manager.getUrn(vaultId);
  console.log('Urn address', vaultUrnAddr);

  await resetVaultStats(managedVault);

  // // Draw the exact amount of DAI
  await drawDai(manager, managedVault, vaultId);

  await jug.drip(ilk);
  if (network === 'testchain') await mineBlocks(maker.service('web3'), 10);
  await resetVaultStats(managedVault);

  let isSafe = managedVault.isSafe;
  let count = 3;
  // Draw DAI 3 times at 99% of available amount to prevent tx reverted errors
  while (count > 0) {
    count--;
    if (network === 'testchain') await mineBlocks(maker.service('web3'), 10);
    await jug.drip(ilk);
    await drawDai(manager, managedVault, vaultId);
    await resetVaultStats(managedVault);
    console.log('Drawing DAI', count, 'more times');
    managedVault = await manager.getCdp(vaultId);
    isSafe = managedVault.isSafe;
  }

  console.log(
    'amount to draw now after drawing',
    (await managedVault.daiAvailable._amount).toFixed(18)
  );

  while (isSafe) {
    if (network === 'testchain') await mineBlocks(maker.service('web3'), 10);
    await jug.drip(ilk);
    await maker
      .service('smartContract')
      .getContract('MCD_SPOT')
      .poke(ilk);
    await resetVaultStats(managedVault);
    managedVault = await manager.getCdp(vaultId);
    isSafe = managedVault.isSafe;
    console.log('Is Vault safe?', isSafe);
  }

  return vaultId;
}
