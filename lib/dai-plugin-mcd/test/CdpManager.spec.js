import { mcdMaker } from './helpers';
import { ServiceRoles } from '../src/constants';
import { stringToBytes } from '../src/utils';

let maker;

beforeAll(async () => {
  maker = await mcdMaker();
});

test('check ETH ilk data', async () => {
  const mgr = maker.service(ServiceRoles.CDP_MANAGER);
  const ilk = await mgr.vat.ilks(stringToBytes('ETH'));
  expect(ilk.take.toString()).toEqual('1000000000000000000000000000');
});

test('check REP ilk data', async () => {
  const mgr = maker.service(ServiceRoles.CDP_MANAGER);
  const ilk = await mgr.vat.ilks(stringToBytes('REP'));
  expect(ilk.take.toString()).toEqual('1000000000000000000000000000');
});

test('check fake collateral type', async () => {
  const mgr = maker.service(ServiceRoles.CDP_MANAGER);
  const ilk = await mgr.vat.ilks(stringToBytes('ZZZ'));
  expect(ilk.take.toString()).toEqual('0');
});
