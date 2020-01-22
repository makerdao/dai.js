import { mcdMaker } from '../helpers';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import BigNumber from 'bignumber.js';

import {
  LIQUIDATOR_ADDRESS,
  LIQUIDATION_PENALTY,
  MAX_AUCTION_LOT_SIZE
} from '../../src/schemas';

import catSchemas from '../../src/schemas/cat';

let maker, snapshotData;

beforeAll(async () => {
  maker = await mcdMaker({
    multicall: true
  });

  snapshotData = await takeSnapshot(maker);
  maker.service('multicall').createWatcher({ interval: 'block' });
  maker.service('multicall').registerSchemas(catSchemas);
  maker.service('multicall').start();
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(LIQUIDATOR_ADDRESS, async () => {
  const expected = '0x55320248dC50Ef6dABc88ECbc294Fd5e2e1f4eC6';
  const address = await maker.latest(LIQUIDATOR_ADDRESS, 'ETH-A');
  expect(address).toEqual(expected);
});

test(LIQUIDATION_PENALTY, async () => {
  const expected = 0.05;
  const liquidationPenalty = await maker.latest(LIQUIDATION_PENALTY, 'ETH-A');
  expect(liquidationPenalty).toEqual(expected);
});

test(MAX_AUCTION_LOT_SIZE, async () => {
  const expected = BigNumber('1.5');
  const maxLotSize = await maker.latest(MAX_AUCTION_LOT_SIZE, 'ETH-A');
  expect(maxLotSize).toEqual(expected);
});
