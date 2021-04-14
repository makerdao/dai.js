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

const linkAmt = '1';
// let vaultId;
let vaultId = 3529; //todo change this back when starting fresh

const urnAdd = '0xB95fFDe0C48F23Df7401b1566C4DA0EDeEF604AC';

export async function liquidateVaults(maker) {
  console.log('vault id:', vaultId);
  const currentAddress = maker.currentAddress();
  const manager = maker.service('mcd:cdpManager');
  const vaultUrnAddr = await manager.getUrn(vaultId);

  const dogContract = maker
    .service('smartContract')
    .getContractByName('MCD_DOG');

  const bark = async urn => await dogContract.bark(ilk, urn, currentAddress);

  try {
    const barked = await bark(vaultUrnAddr);
    const id = barked.receipt.logs[4].topics[3];
    return id;
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

//136.297242792467152560

async function openVaultAndLock(maker) {
  const manager = maker.service('mcd:cdpManager');
  // open vault
  const vault = await manager.open('LINK-A');
  vaultId = vault.id;
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

//compare: 7.16785714285714285714 7.167857142857142857

//Drawing 7.167857142857142857 from Vault #3519

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
  // const amtDai = await managedVault.daiAvailable._amount;
  const amtDai = new BigNumber(0.00015);
  console.log('compare:', amtDai, amtDai.toFixed(18));
  console.log(`Drawing ${amtDai.toFixed(16)} from Vault #${vaultId}`);
  try {
    let drawDai = await manager.draw(vaultId, 'LINK-A', amtDai.toFixed(16));
    drawDai;
  } catch (error) {
    console.error(error);
  }
}

// MAIN
export async function createVaults(maker, network = 'testchain') {
  BigNumber.config({ ROUNDING_MODE: 1 }); //rounds down
  const me = maker.currentAddress();
  console.log('CURRENT ADDRESS:', me);
  await getPrice(maker);

  const linkToken = await maker.getToken(LINK);
  console.log('Link Balance:', (await linkToken.balanceOf(me)).toString());

  const manager = maker.service('mcd:cdpManager');
  const jug = maker.service('smartContract').getContract('MCD_JUG');

  // Initial Setup
  if (network === 'testchain') await setProxyAndAllowances(maker); //not needed for kovan

  // Open a risky Vault and lock LINK
  // const vault = await openVaultAndLock(maker);
  // const vaultId = vault.id;

  // Only use on kovan and when not running a fresh one or
  // const proxyAddress = await maker.service('proxy').getProxyAddress();
  // const [{ id: vaultId }] = await manager.getCdpIds(proxyAddress);
  // console.log('vaultId', vaultId);

  const managedVault = await manager.getCdp(vaultId);
  // const vaultUrnAddr = await manager.getUrn(vaultId);
  // urns.push(vaultUrnAddr);
  // await resetVaultStats(managedVault);

  // if (network === 'testchain') await mineBlocks(maker.service('web3'), 10);
  await jug.drip(ilk);

  // // First check if vault is safe?
  // await vaultStats(managedVault, '1 ------');

  // // Draw the exact amount of DAI
  await drawDai(manager, managedVault, vaultId);
  await resetVaultStats(managedVault);

  // const amtDai2 = await managedVault.daiAvailable._amount;
  // console.log('amount to draw now after drawing', amtDai2.toFixed(18));

  // await vaultStats(managedVault, '1.5 -------');

  // if (network === 'testchain') await mineBlocks(maker.service('web3'), 10);
  await jug.drip(ilk);

  // // Now check if vault is safe after draw & drip?
  // await vaultStats(managedVault, '2 -------');

  // if (network === 'testchain') await mineBlocks(maker.service('web3'), 10);

  // // Set price too low
  // // await setLinkPrice(maker);
  // if (network === 'testchain') await mineBlocks(maker.service('web3'), 10);
  await jug.drip(ilk);
  await maker
    .service('smartContract')
    .getContract('MCD_SPOT')
    .poke(ilk);

  await resetVaultStats(managedVault);

  // show price
  await getPrice(maker);

  // Now check if vault is safe after draw & drip?
  await vaultStats(managedVault, '3 ----------');
  console.log('URNS', urns);
}
