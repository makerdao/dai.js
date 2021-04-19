import { LINK, DAI } from '@makerdao/dai-plugin-mcd';
import { mineBlocks } from '../../test-helpers/src';
import BigNumber from 'bignumber.js';

const ilk = '0x4c494e4b2d41'; // LINK-A

export async function setLiquidationsApprovals(maker) {
  const joinAddress = maker.service('smartContract').getContract('MCD_JOIN_DAI')
    .address;
  const linkClipperAddress = maker
    .service('smartContract')
    .getContract('MCD_CLIP_LINK_A').address;

  try {
    //req to move dai from me to vat
    await maker.getToken('DAI').approveUnlimited(joinAddress);
  } catch (e) {
    throw new Error(`Error approving DAI allowance for join address: ${e}`);
  }

  try {
    //req to manipulate my vat dai balance (to "pay" for take calls)
    await maker
      .service('smartContract')
      .getContract('MCD_VAT')
      .hope(joinAddress);
  } catch (e) {
    throw new Error(`Error hoping the join address: ${e}`);
  }
  try {
    //req for clipper to manipulate vat balance (req for each clipper)
    await maker
      .service('smartContract')
      .getContract('MCD_VAT')
      .hope(linkClipperAddress);
  } catch (e) {
    throw new Error(`Error hoping the link clipper address: ${e}`);
  }
}

async function setProxyAndAllowances(maker) {
  const kprAddress = maker.currentAddress();
  const linkToken = await maker.getToken(LINK);

  await maker.service('proxy').ensureProxy();
  const proxyAddress = await maker.service('proxy').getProxyAddress();

  const linkAllowance = await linkToken.allowance(kprAddress, proxyAddress);
  if (Number(linkAllowance._amount) === 0) {
    await linkToken.approveUnlimited(proxyAddress);
  }
}

async function openVaultAndLock(maker, linkAmt) {
  const manager = maker.service('mcd:cdpManager');
  // open vault
  const vault = await manager.open('LINK-A');
  // lock collateral
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
  const manager = maker.service('mcd:cdpManager');
  const jug = maker.service('smartContract').getContract('MCD_JUG');
  const linkAmt = network === 'testchain' ? '25' : '5';

  // Initial Setup
  if (network === 'testchain') await setProxyAndAllowances(maker); //not needed for kovan

  // Open a Vault and lock LINK
  const vault = await openVaultAndLock(maker, linkAmt);
  const vaultId = vault.id;

  let managedVault = await manager.getCdp(vaultId);

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
    managedVault = await manager.getCdp(vaultId);
    isSafe = managedVault.isSafe;
  }

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
