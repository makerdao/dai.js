import { mcdMaker } from './helpers';
import MultiCdpHandler from '../src/MultiCdpHandler';
import { REP } from '../src';
import Maker from '@makerdao/dai';
const { ETH } = Maker;

let maker, txMgr, rep;

beforeAll(async () => {
  maker = await mcdMaker();
  txMgr = maker.service('transactionManager');

  // fund the account with some REP; this works becuse the test account owns the
  // REP contract
  rep = maker.getToken('REP');
  await rep._contract['mint(uint256)'](REP(100).toEthersBigNumber('wei'));
});

test('get count of cdps for current address', async () => {
  const count = await maker.service('multiCdp').getCount();
  expect(count.toNumber()).toEqual(0);
});

test('create a cdp handler', async () => {
  const mined = jest.fn();

  const open = maker.openMultiCdp();
  txMgr.listen(open, { mined });
  const cdp = await open;
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
  const cdp = await maker.openMultiCdp();
  await cdp.lock(ETH(1));
  const lockedAmount = await cdp.getLockedAmount(ETH);
  expect(lockedAmount.eq(ETH(1))).toBeTruthy();
});

test.skip('lock REP', async () => {
  const cdp = await maker.openMultiCdp();
  const lock = cdp.lock(REP(1));
  txMgr.listen(lock, (tx, state, err) => {
    if (err) {
      console.error(tx.receipt);
    }
  });
  await lock;
  const lockedAmount = await cdp.getLockedAmount(REP);
  console.log(lockedAmount.toString());
  expect(lockedAmount.eq(REP(1))).toBeTruthy();
});

test.skip('look up a cdp handler', async () => {
  // verify the amount of ETH deposited above
});
