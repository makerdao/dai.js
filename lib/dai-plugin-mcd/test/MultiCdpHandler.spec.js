import { mcdMaker } from './helpers';
import MultiCdpHandler from '../src/MultiCdpHandler';

let maker;

beforeAll(async () => {
  maker = await mcdMaker();
});

test('get count of cdps for current address', async () => {
  const count = await maker.service('multiCdp').getCount();
  expect(count.toNumber()).toEqual(0);
});

test('create a cdp handler', async () => {
  const cdp = await maker.openMultiCdp();
  expect(cdp).toBeInstanceOf(MultiCdpHandler);
  console.log('more to come');
});
