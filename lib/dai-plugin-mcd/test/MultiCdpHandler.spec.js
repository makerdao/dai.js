import { mcdMaker } from './helpers';
import MultiCdpHandler from '../src/MultiCdpHandler';
import Maker from '@makerdao/dai';
const { ETH } = Maker;

let maker, cdp;

beforeAll(async () => {
  maker = await mcdMaker();
});

test('get count of cdps for current address', async () => {
  const count = await maker.service('multiCdp').getCount();
  expect(count.toNumber()).toEqual(0);
});

test('create a cdp handler', async () => {
  const txm = maker.service('transactionManager');
  const mined = jest.fn();

  const open = maker.openMultiCdp();
  txm.listen(open, { mined });
  cdp = await open;
  expect(mined).toBeCalled();

  expect(cdp).toBeInstanceOf(MultiCdpHandler);
  expect(cdp.address).toMatch(/0x[A-Fa-f0-9]{40}/);

  const mcs = maker.service('multiCdp');
  const count = await mcs.getCount();
  expect(count.toNumber()).toEqual(1);

  const address = await mcs.registry.handlers(maker.currentAddress(), '0x0');
  expect(address).toEqual(cdp.address);

  const inRegistry = await mcs.registry.inRegistry(address);
  expect(inRegistry).toBe(true);
});

test('lock ETH', async () => {
  await cdp.lock(ETH(1));
  console.log('TODO confirm that the right amount was locked');
});

test.skip('look up a cdp handler', async () => {
  // verify the amount of ETH deposited above
});
