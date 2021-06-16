import { DAI } from '@makerdao/dai-plugin-mcd';
import { mineBlocks } from '../../test-helpers/src';
import BigNumber from 'bignumber.js';
import { stringToBytes } from '../src/LiquidationService';

function _clipperContractByIlk(maker, ilk) {
  const suffix = ilk.replace('-', '_');
  return maker.service('smartContract').getContractByName(`MCD_CLIP_${suffix}`);
}

export async function setLiquidationsApprovals(maker, ilk) {
  const joinAddress = maker.service('smartContract').getContract('MCD_JOIN_DAI')
    .address;
  const clipperAddress = _clipperContractByIlk(maker, ilk).address;
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
      .hope(clipperAddress);
  } catch (e) {
    throw new Error(`Error hoping the clipper address: ${e}`);
  }
}

async function setProxyAndAllowances(maker, token) {
  const kprAddress = maker.currentAddress();
  const tok = await maker.getToken(token);

  await maker.service('proxy').ensureProxy();
  const proxyAddress = await maker.service('proxy').getProxyAddress();

  const allowance = await tok.allowance(kprAddress, proxyAddress);
  if (Number(allowance._amount) === 0) {
    await tok.approveUnlimited(proxyAddress);
  }
}

async function openVaultAndLock(maker, amt, ilk, token) {
  const manager = maker.service('mcd:cdpManager');
  // open vault
  const vault = await manager.open(ilk);
  // lock collateral
  try {
    await manager.lock(vault.id, ilk, token(amt));
  } catch (e) {
    console.error('lock error:', e);
  }

  return vault;
}

async function resetVaultStats(vault) {
  vault.reset();
  await vault.prefetch();
}

async function drawDai(manager, managedVault, vaultId, ilk) {
  const percent = 0.985;
  const amtDai = await managedVault.daiAvailable._amount;

  try {
    let drawDai = await manager.draw(
      vaultId,
      ilk,
      DAI(amtDai.times(percent).toFixed(17))
    );
    drawDai;
  } catch (error) {
    console.error(error);
  }
}

// MAIN
export async function createVaults(maker, network = 'testchain', ilk, token) {
  BigNumber.config({ ROUNDING_MODE: 1 }); //rounds down
  const manager = maker.service('mcd:cdpManager');
  const jug = maker.service('smartContract').getContract('MCD_JUG');
  // const amt = network === 'testchain' ? '25' : '.1';
  const amtToOpen = {
    'BAT-A': '150',
    'ETH-A': '1',
    'ETH-B': '1',
    'ETH-C': '1',
    'AAVE-A': '3',
    'UNI-A': '50',
    'ZRX-A': '100',
    'RENBTC-A': '0.01',
    'LRC-A': '300',
    'MANA-A': '225',
    'COMP-A': '0.75',
    'KNC-A': '100',
    'BAL-A': '10',
    'UNIV2DAIETH-A': '1.7',
    'GUSD-A': '150',
    'USDC-A': '150',
    'USDC-B': '150',
    'PAXUSD-A': '150',
    'USDT-A': '150',
    'TUSD-A': '150',
  };
  const amt = network === 'testchain' ? '25' : amtToOpen[ilk] || '.1';

  // Initial Setup
  await setProxyAndAllowances(maker, token);

  // Open a Vault and lock collateral
  const vault = await openVaultAndLock(maker, amt, ilk, token);
  const vaultId = vault.id;

  let managedVault = await manager.getCdp(vaultId);

  await resetVaultStats(managedVault);

  // // Draw the exact amount of DAI
  await drawDai(manager, managedVault, vaultId, ilk);

  await jug.drip(stringToBytes(ilk));
  if (network === 'testchain') await mineBlocks(maker.service('web3'), 10);
  await resetVaultStats(managedVault);

  let isSafe = managedVault.isSafe;
  let count = 3;
  // Draw DAI 3 times at 99% of available amount to prevent tx reverted errors
  while (count > 0) {
    count--;
    if (network === 'testchain') await mineBlocks(maker.service('web3'), 10);
    await jug.drip(stringToBytes(ilk));
    await drawDai(manager, managedVault, vaultId);
    await resetVaultStats(managedVault);
    managedVault = await manager.getCdp(vaultId);
    isSafe = managedVault.isSafe;
  }

  while (isSafe) {
    if (network === 'testchain') await mineBlocks(maker.service('web3'), 10);
    await jug.drip(stringToBytes(ilk));
    await maker
      .service('smartContract')
      .getContract('MCD_SPOT')
      .poke(stringToBytes(ilk));
    await resetVaultStats(managedVault);
    managedVault = await manager.getCdp(vaultId);
    isSafe = managedVault.isSafe;
    console.log('Is Vault safe?', isSafe);
  }

  return vaultId;
}
