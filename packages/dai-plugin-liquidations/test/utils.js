import { DAI, LINK } from '../../dai-plugin-mcd/src';
import { mineBlocks } from '../../test-helpers/src';

const ilk =
  '0x4c494e4b2d410000000000000000000000000000000000000000000000000000';
let urns = [];
// const dogAddress = '0x795f65578081AA750d874E1a3A6c434D1D98E118';

export async function createAuctions(maker) {
  const kprAddress = maker.currentAddress();

  const dogContract = maker
    .service('smartContract')
    .getContractByName('MCD_DOG');

  const bark = async urn => {
    await dogContract.bark(ilk, urn, kprAddress);
  };

  for (let i = 0; i < urns.length; i++) {
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

  const vault = await manager.open('LINK-A');
  let vaultId = vault.id;
  console.log('Vault ID', vaultId);

  const linkAmt = 20;

  console.log(`Locking ${linkAmt} LINK-A`);
  await manager.lock(vault.id, 'LINK-A', LINK(linkAmt));

  console.log('mining blocks');
  await mineBlocks(maker.service('web3'), 6);

  console.log(' ');
  console.log('Dripping LINK-A JUG');
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

  const amtDai = await managedVault.daiAvailable._amount;

  console.log('Collateral Value: ', managedVault.collateralValue._amount);
  console.log('DAI Available to Generate', managedVault.daiAvailable._amount);
  console.log('Debt Value: ', managedVault.debtValue._amount);
  console.log(
    'Collateralization Ratio ',
    managedVault.collateralizationRatio._amount
  );
  console.log('Liquidation Price ', managedVault.liquidationPrice._amount);
  console.log('Is Vault safe? ', managedVault.isSafe);

  console.log(' ');
  console.log(`Drawing ${DAI(amtDai.toFixed(17))} from Vault #${vaultId}`);

  try {
    let drawDai = await manager.draw(
      vaultId,
      'LINK-A',
      DAI(amtDai.toFixed(17))
    );
    drawDai;
  } catch (error) {
    console.error(error);
  }
  // todo optimize where/how we mine blocks so vault becomes unsafe
  console.log('mining blocks');
  await mineBlocks(maker.service('web3'), 6);

  console.log(' ');
  console.log('Dripping LINK-A JUG');
  await maker
    .service('smartContract')
    .getContract('MCD_JUG')
    .drip(ilk);

  //Refreshing Vault Data
  managedVault.reset();
  await managedVault.prefetch();

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
  console.log('Is Vault safe? ', managedVault.isSafe);
}
