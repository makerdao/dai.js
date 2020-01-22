import { mcdMaker } from '../helpers';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import BigNumber from 'bignumber.js';
import { isValidAddressString } from '../../src/utils';

import {
  PRICE_FEED_ADDRESS,
  RAW_LIQUIDATION_RATIO,
  LIQUIDATION_RATIO,
  RATIO_DAI_USD
} from '../../src/schemas';

import spotSchemas from '../../src/schemas/spot';

let maker, snapshotData;

beforeAll(async () => {
  maker = await mcdMaker({
    multicall: true
  });

  snapshotData = await takeSnapshot(maker);
  maker.service('multicall').createWatcher({ interval: 'block' });
  maker.service('multicall').registerSchemas(spotSchemas);
  maker.service('multicall').start();
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(PRICE_FEED_ADDRESS, async () => {
  const ethAPriceFeedAddress = await maker.latest(PRICE_FEED_ADDRESS, 'ETH-A');
  const batAPriceFeedAddress = await maker.latest(PRICE_FEED_ADDRESS, 'BAT-A');

  expect(isValidAddressString(ethAPriceFeedAddress)).toEqual(true);
  expect(isValidAddressString(batAPriceFeedAddress)).toEqual(true);

  expect(ethAPriceFeedAddress).toEqual(
    '0xb0ae8c0856259C6fe000F8e2C14507E5FC167D48'
  );
  expect(batAPriceFeedAddress).toEqual(
    '0x80f178c7b47cb635Ceb12aBB891338744e98365C'
  );
});

test(RAW_LIQUIDATION_RATIO, async () => {
  const ethARawLiquidationRatio = await maker.latest(
    RAW_LIQUIDATION_RATIO,
    'ETH-A'
  );
  const batARawLiquidationRatio = await maker.latest(
    RAW_LIQUIDATION_RATIO,
    'BAT-A'
  );

  expect(ethARawLiquidationRatio).toEqual(BigNumber('1.5'));
  expect(batARawLiquidationRatio).toEqual(BigNumber('2.0'));
});

test(LIQUIDATION_RATIO, async () => {
  const ethALiquidationRatio = await maker.latest(LIQUIDATION_RATIO, 'ETH-A');
  const batALiquidationRatio = await maker.latest(LIQUIDATION_RATIO, 'BAT-A');

  expect(ethALiquidationRatio.symbol).toEqual('(ETH/USD)/(MDAI/USD)');
  expect(batALiquidationRatio.symbol).toEqual('(BAT/USD)/(MDAI/USD)');

  expect(ethALiquidationRatio.toNumber()).toEqual(1.5);
  expect(batALiquidationRatio.toNumber()).toEqual(2.0);
});

test(RATIO_DAI_USD, async () => {
  const ratio = await maker.latest(RATIO_DAI_USD);
  expect(ratio.symbol).toEqual('MDAI/USD');
  expect(ratio.toNumber()).toEqual(1);
});
