import { mcdMaker } from './helpers';
import { DGX, REP } from '../src';
import addresses from '../contracts/addresses/testnet.json';

let maker;

beforeAll(async () => {
  maker = await mcdMaker();
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
  expect(await rep.balance()).toEqual(REP(0));
});

test('DGX token basic functionality', async () => {
  const dgx = maker.getToken('DGX');
  expect(dgx.address()).toEqual(addresses.DGX);
  expect(await dgx.balance()).toEqual(DGX(0));
});
