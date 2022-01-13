import { McdPlugin, BAT } from '../src';
import { mcdMaker } from './helpers';
import addresses from '../contracts/addresses/testnet.json';

let maker;

beforeAll(async () => {
  maker = await mcdMaker({ prefetch: false });
});

test('addConfig outputs contract addresses for all networks', () => {
  let {
    smartContract: { addContracts },
    token: { erc20 }
  } = McdPlugin.addConfig();

  // there are more addresses for testnet than other networks
  for (const contract of Object.values(addContracts)) {
    expect(contract.address).toEqual(
      expect.objectContaining({
        testnet: expect.any(String)
      })
    );
  }

  for (const token of erc20) {
    expect(token.address).toEqual({
      testnet: expect.any(String),
      goerlifork: expect.any(String),
      // kovan no longer actively supported
      // kovan: expect.any(String),
      goerli: expect.any(String),
      mainnet: expect.any(String)
    });
  }
});

test('contract address mapping', async () => {
  const address = maker
    .service('smartContract')
    .getContractAddressByName('PIP_ETH');
  expect(address).toEqual(addresses.PIP_ETH);
});

test('contract address overrides', async () => {
  const addr1 = '0x520cca6e73540fa2d483232d7545ee8fadd8a23d';
  const addr2 = '0xa0b85e616f0e7997982d57b2d5984a994f657a8d';

  const maker2 = await mcdMaker({
    addressOverrides: { PIP_ETH: addr1, BAT: addr2 },
    prefetch: false
  });

  const scs = maker2.service('smartContract');
  expect(scs.getContractAddress('PIP_ETH')).toEqual(addr1);
  expect(() => {
    maker2.service('token').getToken('BAT');
  }).not.toThrowError();
});

test('BAT token basic functionality', async () => {
  const token = maker.getToken('BAT');
  expect(token.address()).toEqual(addresses.BAT);
  expect(await token.balance()).toEqual(BAT(10000));
});

test('McdPlugin has a named and a default export', async () => {
  expect(require('../src').default).toEqual(McdPlugin);
  expect(require('../src').McdPlugin).toEqual(McdPlugin);
});
