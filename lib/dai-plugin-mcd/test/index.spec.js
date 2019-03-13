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

test('mcd contract addresses can be overridden', async () => {
  const RANDOM_ADDRESS = '0x520cca6e73540fa2d483232d7545ee8fadd8a23d';
  expect(RANDOM_ADDRESS).not.toEqual(addresses.PIP_DGX);
  const addressOverrides = {
    PIP_DGX: RANDOM_ADDRESS
  };

  const customMakerInstance = await mcdMaker({ addressOverrides });
  const makerPipDgxAddress = customMakerInstance
    .service('smartContract')
    .getContractAddressByName('PIP_DGX');
  expect(makerPipDgxAddress).toEqual(RANDOM_ADDRESS);
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
