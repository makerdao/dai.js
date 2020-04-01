import { mcdMaker } from '../helpers';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import BigNumber from 'bignumber.js';

import {
  CURRENT_PRICE_FEED_VALUE,
  CURRENT_PRICE_FEED_VALID
} from '../../src/schemas';

import osmSchemas from '../../src/schemas/osm';

let maker, snapshotData;

beforeAll(async () => {
  maker = await mcdMaker({
    multicall: true
  });

  snapshotData = await takeSnapshot(maker);
  maker.service('multicall').createWatcher();
  maker.service('multicall').registerSchemas(osmSchemas);
  maker.service('multicall').start();
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(CURRENT_PRICE_FEED_VALUE, async () => {
  const priceFeedValueETH = await maker.latest(CURRENT_PRICE_FEED_VALUE, 'ETH');
  const priceFeedValueBAT = await maker.latest(CURRENT_PRICE_FEED_VALUE, 'BAT');
  expect(priceFeedValueETH).toEqual(BigNumber('150'));
  expect(priceFeedValueBAT).toEqual(BigNumber('40'));
});

test(CURRENT_PRICE_FEED_VALID, async () => {
  const priceFeedValid = await maker.latest(CURRENT_PRICE_FEED_VALID, 'ETH');
  expect(priceFeedValid).toEqual(true);
});
