import { COL1 } from '../src';
import { mcdMaker } from './helpers';
import addresses from '../contracts/addresses/testnet.json';

let maker;

beforeAll(async () => {
  maker = await mcdMaker();
});

test('contract address mapping', async () => {
  const address = maker
    .service('smartContract')
    .getContractAddressByName('PIP_ETH');
  expect(address).toEqual(addresses.PIP_ETH);
});

test('contract address overrides', async () => {
  const RANDOM_ADDRESS = '0x520cca6e73540fa2d483232d7545ee8fadd8a23d';
  expect(RANDOM_ADDRESS).not.toEqual(addresses.PIP_ETH);

  const customMakerInstance = await mcdMaker({
    addressOverrides: { PIP_ETH: RANDOM_ADDRESS }
  });
  const address = customMakerInstance
    .service('smartContract')
    .getContractAddressByName('PIP_ETH');
  expect(address).toEqual(RANDOM_ADDRESS);
});

test('COL1 token basic functionality', async () => {
  const token = maker.getToken('COL1');
  expect(token.address()).toEqual(addresses.COL1);
  expect(await token.balance()).toEqual(COL1(1000));
});
