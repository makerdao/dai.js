
export async function createAuctions (maker) {

}

export async function createVaults(maker) {
  console.log('Creating risky vault');
  const manager = maker.service('mcd:cdpManager');

  const vault = await manager.open('LINK-A');
  let vaultId = vault.id;
  console.log('Vault ID', vaultId);

  const linkAmt = 20;

  console.log(`Locking ${linkAmt} LINK-A`);
  // await manager.lock(vault.id, 'LINK-A', LINK(16.49));
  await manager.lock(vault.id, 'LINK-A', LINK(linkAmt));

  linkBalance = await maker.getToken(LINK).balance();

  console.log('mining blocks');
  await mineBlocks(maker.service('web3'), 6);

  // const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  // console.log('sleeping');
  // await sleep(20000);

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