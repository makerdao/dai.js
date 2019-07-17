import { migrationMaker } from './helpers';
import addresses from '../contracts/addresses/testnet.json';

let maker;

beforeAll(async () => {
  maker = await migrationMaker();
});

test('contract address mapping', async () => {
  const address = maker
    .service('smartContract')
    .getContractAddressByName('TUB');
  expect(address).toEqual(addresses.TUB);
});

test('contract address overrides', async () => {
  const addr1 = '0x520cca6e73540fa2d483232d7545ee8fadd8a23d';

  const maker2 = await migrationMaker({
    addressOverrides: { TUB: addr1 }
  });

  const scs = maker2.service('smartContract');
  expect(scs.getContractAddress('TUB')).toEqual(addr1);
});
