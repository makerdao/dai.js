import { migrationMaker } from '../helpers';

let address, maker, mkr, oldMkr, redeemer;

describe('basic contract and token accessibility', () => {
  beforeAll(async () => {
    maker = await migrationMaker();
    address = maker.service('web3').currentAddress();
    mkr = maker.getToken('MKR');
    oldMkr = maker.getToken('OLD_MKR');
    redeemer = maker.service('smartContract').getContractByName('REDEEMER');

    await redeemer.start();
    await oldMkr.approveUnlimited(address);
    await mkr.approveUnlimited(address);
  });

  test('redeemer was deployed correctly', async () => {
    // this test can be removed when testchain changes
    // are finalized, but it's useful for now

    const oldAddress = await redeemer.from();
    const newAddress = await redeemer.to();

    console.log(oldAddress);
    console.log(newAddress);
    expect(oldAddress).not.toBe('0x0000000000000000000000000000000000000000');
    expect(newAddress).not.toBe('0x0000000000000000000000000000000000000000');
  });

  test('get old mkr balance', async () => {
    const oldMkrBalance = await maker.getToken('OLD_MKR').balanceOf(address);
    expect(oldMkrBalance.toNumber()).toBe(400);
  });
});
