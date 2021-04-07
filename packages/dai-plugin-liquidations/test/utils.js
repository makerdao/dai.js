import { setPrice } from '../../dai-plugin-mcd/test/helpers';
import { LINK, USD, ServiceRoles } from '@makerdao/dai-plugin-mcd';
import { createCurrencyRatio } from '@makerdao/currency';
import { mineBlocks } from '../../test-helpers/src';
import BigNumber from 'bignumber.js';

const ilk = '0xed9989084c494e4b2d41';
// const ilk =
//   '0x4c494e4b2d410000000000000000000000000000000000000000000000000000';
let urns = [];
// const dogAddress = '0x795f65578081AA750d874E1a3A6c434D1D98E118';

const linkAmt = 20;

export async function createAuctions(maker) {
  const currentAddress = maker.currentAddress();

  const dogContract = maker
    .service('smartContract')
    .getContractByName('MCD_DOG');

  const bark = async urn => {
    await dogContract.bark(ilk, urn, currentAddress);
  };

  for (let i = 0; i < urns.length; i++) {
    console.log('number of urns to bark', urns.length);
    console.log('Barking ', urns[i]);
    await bark(urns[i]);
  }
  console.log('Barked Urns: ');
  for (let i = 0; i < urns.length; i++) {
    console.log(urns[i]);
  }
}

export async function createVaults(maker) {
  console.log('Creating risky vault');
  const manager = maker.service('mcd:cdpManager');

  // TODO: move proxy and allowance checks
  const kprAddress = maker.currentAddress();
  const linkToken = await maker.getToken(LINK);

  console.log('Ensure there is proxy address');
  await maker.service('proxy').ensureProxy();
  const proxyAddress = await maker.service('proxy').getProxyAddress();
  console.log('Proxy Address: ', proxyAddress);

  //Check for token allowance
  const linkAllowance = await linkToken.allowance(kprAddress, proxyAddress);
  if (Number(linkAllowance._amount) === 0) {
    console.log('Approving Proxy to use LINK');
    await linkToken.approveUnlimited(proxyAddress);
  }

  // open vault
  const vault = await manager.open('LINK-A');
  let vaultId = vault.id;
  console.log('Vault ID', vaultId);

  // lock collateral
  console.log(`Locking ${linkAmt} LINK-A`);
  await manager.lock(vault.id, 'LINK-A', LINK(linkAmt));

  console.log('mining blocks');
  await mineBlocks(maker.service('web3'), 10);

  // drip 1
  console.log(' ');
  console.log('Dripping LINK-A JUG (1)');
  await maker
    .service('smartContract')
    .getContract('MCD_JUG')
    .drip(ilk);

  // Refreshing vault data
  vault.reset();
  await vault.prefetch();

  // Reading Vault Information
  let managedVault = await manager.getCdp(vaultId);
  managedVault.reset();
  await managedVault.prefetch();
  const vaultUrnAddr = await manager.getUrn(vaultId);
  console.log('Vault: Urn Address', vaultUrnAddr);
  urns.push(vaultUrnAddr);

  console.log('Collateral Value: ', managedVault.collateralValue._amount);
  console.log('DAI Available to Generate', managedVault.daiAvailable._amount);
  console.log('Debt Value: ', managedVault.debtValue._amount);
  console.log(
    'Collateralization Ratio ',
    managedVault.collateralizationRatio._amount
  );
  console.log('Liquidation Price ', managedVault.liquidationPrice._amount);
  console.log('Is Vault safe 1 (before drip)? ', managedVault.isSafe);

  // draw DAI
  console.log(' ');
  BigNumber.config({ ROUNDING_MODE: 1 }); //rounds down
  const amtDai = await managedVault.daiAvailable._amount;
  console.log(`Drawing ${amtDai.toFixed(18)} from Vault #${vaultId}`);
  try {
    let drawDai = await manager.draw(vaultId, 'LINK-A', amtDai.toFixed(18));
    drawDai;
  } catch (error) {
    console.error(error);
  }
  // todo optimize where/how we mine blocks so vault becomes unsafe
  console.log('mining blocks');
  await mineBlocks(maker.service('web3'), 10);

  // Set price
  const cdpType = maker
    .service(ServiceRoles.CDP_TYPE)
    .getCdpType(null, 'LINK-A');
  const { currency } = cdpType;
  await setPrice(maker, createCurrencyRatio(USD, currency)(1), 'LINK-A');

  const linkA = '0x4c494e4b2d41';
  await maker
    .service('smartContract')
    .getContract('MCD_SPOT')
    .poke(linkA);

  //Refreshing Vault Data
  managedVault.reset();
  await managedVault.prefetch();
  console.log('Is Vault safe (after changing price)? ', managedVault.isSafe);

  // Getting Updated state from Vault
  console.log(' ');
  console.log('Collateral Value: ', managedVault.collateralValue._amount);
  console.log('DAI Available to Generate', managedVault.daiAvailable._amount);
  console.log('Debt Value: ', managedVault.debtValue._amount);
  console.log(
    'Collateralization Ratio ',
    managedVault.collateralizationRatio._amount
  );
  console.log('Liquidation Price ', managedVault.liquidationPrice._amount);
  console.log('Is Vault safe? (final)', managedVault.isSafe);
}
