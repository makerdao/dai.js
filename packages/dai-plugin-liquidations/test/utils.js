import { setPrice } from '../../dai-plugin-mcd/test/helpers';
import { LINK, USD, ServiceRoles } from '@makerdao/dai-plugin-mcd';
import { createCurrencyRatio } from '@makerdao/currency';
import { mineBlocks } from '../../test-helpers/src';
import BigNumber from 'bignumber.js';

// const ilk = '0xed9989084c494e4b2d41'; //from seth (the first bit is the contract sig 'ed998908')
const ilk = '0x4c494e4b2d41'; // Ethans
//stringToBytes = 0x4c494e4b2d41
// const ilk =
//   '0x4c494e4b2d410000000000000000000000000000000000000000000000000000'; //original
let urns = [];
// const dogAddress = '0x795f65578081AA750d874E1a3A6c434D1D98E118';
//99800418305638316473488226407242625739110630383877768873912206733733181632051

const linkAmt = '20';

const urnAdd = '0xB95fFDe0C48F23Df7401b1566C4DA0EDeEF604AC';

export async function liquidateVaults(maker) {
  const currentAddress = maker.currentAddress();

  const dogContract = maker
    .service('smartContract')
    .getContractByName('MCD_DOG');

  const bark = async urn => await dogContract.bark(ilk, urn, currentAddress);

  try {
    const barked = await bark(urnAdd);
    console.log('bark', barked);
  } catch (e) {
    console.error(e);
  }
}

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

async function openVaultAndLock(maker) {
  const manager = maker.service('mcd:cdpManager');
  // open vault
  const vault = await manager.open('LINK-A');
  let vaultId = vault.id;
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

async function setLinkPrice(maker) {
  const cdpType = maker
    .service(ServiceRoles.CDP_TYPE)
    .getCdpType(null, 'LINK-A');
  const { currency } = cdpType;
  await setPrice(maker, createCurrencyRatio(USD, currency)(4), 'LINK-A');
  await maker
    .service('smartContract')
    .getContract('MCD_SPOT')
    .poke(ilk);
}

async function resetVaultStats(vault) {
  vault.reset();
  await vault.prefetch();
}

//102000000000000000000000000000
//102160000018221179642813508263721367230543331440

function vaultStats(managedVault, message) {
  console.log(message);
  console.log('Collateral Value: ', managedVault.collateralValue._amount);
  console.log('DAI Available to Generate', managedVault.daiAvailable._amount);
  console.log('Debt Value: ', managedVault.debtValue._amount);
  console.log(
    'Collateralization Ratio ',
    managedVault.collateralizationRatio._amount
  );
  console.log('Liquidation Price ', managedVault.liquidationPrice._amount);
  console.log('Is Vault safe?', managedVault.isSafe);
}

async function drawDai(manager, managedVault, vaultId) {
  const amtDai = await managedVault.daiAvailable._amount;
  console.log(`Drawing ${amtDai.toFixed(18)} from Vault #${vaultId}`);
  try {
    let drawDai = await manager.draw(vaultId, 'LINK-A', amtDai.toFixed(18));
    drawDai;
  } catch (error) {
    console.error(error);
  }
}

// MAIN
export async function createVaults(maker) {
  BigNumber.config({ ROUNDING_MODE: 1 }); //rounds down
  await getPrice(maker);

  const linkToken = await maker.getToken(LINK);
  console.log(
    'Link Balance:',
    await linkToken.balanceOf(maker.currentAddress())
  );

  const manager = maker.service('mcd:cdpManager');
  const jug = maker.service('smartContract').getContract('MCD_JUG');

  // Initial Setup
  await setProxyAndAllowances(maker); //not needed for kovan

  // Open a risky Vault and lock LINK
  const vault = await openVaultAndLock(maker);
  const vaultId = vault.id;
  const managedVault = await manager.getCdp(vaultId);
  const vaultUrnAddr = await manager.getUrn(vaultId);
  urns.push(vaultUrnAddr);
  await resetVaultStats(vault);

  await mineBlocks(maker.service('web3'), 10);
  await jug.drip(ilk);

  // First check if vault is safe?
  await vaultStats(vault, '1 ------');

  // Draw the exact amount of DAI
  await drawDai(manager, managedVault, vaultId);
  await resetVaultStats(vault);

  const amtDai2 = await managedVault.daiAvailable._amount;
  console.log('amount to draw now after drawing', amtDai2.toFixed(18));

  await vaultStats(vault, '1.5 -------');

  await mineBlocks(maker.service('web3'), 10);
  await jug.drip(ilk);

  // Now check if vault is safe after draw & drip?
  await vaultStats(vault, '2 -------');

  await mineBlocks(maker.service('web3'), 10);

  // Set price too low
  // await setLinkPrice(maker);
  await mineBlocks(maker.service('web3'), 10);
  await jug.drip(ilk);
  await maker
    .service('smartContract')
    .getContract('MCD_SPOT')
    .poke(ilk);

  await resetVaultStats(vault);

  // show price
  await getPrice(maker);

  // Now check if vault is safe after draw & drip?
  await vaultStats(vault, '3 ----------');
  console.log('URNS', urns);
}
