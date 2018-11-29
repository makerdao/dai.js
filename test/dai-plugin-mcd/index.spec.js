import Maker from '../../src';
import McdPlugin, { REP } from '../../lib/dai-plugin-mcd/src';
import addresses from '../../lib/dai-plugin-mcd/contracts/addresses/testnet.json';

let maker;

beforeAll(async () => {
  maker = Maker.create('test', {
    plugins: [McdPlugin],
    log: false
  });

  await maker.authenticate();
});

test('contract address mapping', async () => {
  const address = maker
    .service('smartContract')
    .getContractAddressByName('PIP_DGX');
  expect(address).toEqual(addresses.PIP_DGX);
});

test('REP token basic functionality', async () => {
  const rep = maker.getToken('REP');
  expect(rep.address()).toEqual(addresses.REP);
  const balance = await rep.balanceOf(maker.currentAddress());
  expect(balance).toEqual(REP(0));
});
