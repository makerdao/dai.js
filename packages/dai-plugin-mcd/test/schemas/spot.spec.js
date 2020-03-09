import { mcdMaker } from '../helpers';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { isValidAddressString } from '../../src/utils';
import testnetAddresses from '../../contracts/addresses/testnet';

import {
  PRICE_FEED_ADDRESS,
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
  maker.service('multicall').createWatcher();
  maker.service('multicall').registerSchemas(spotSchemas);
  maker.service('multicall').start();
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(PRICE_FEED_ADDRESS, async () => {
  const ethAPriceFeedAddress = await maker.latest(PRICE_FEED_ADDRESS, 'ETH-A');
  const batAPriceFeedAddress = await maker.latest(PRICE_FEED_ADDRESS, 'BAT-A');

  const { PIP_ETH, PIP_BAT } = testnetAddresses;

  expect(isValidAddressString(ethAPriceFeedAddress)).toEqual(true);
  expect(isValidAddressString(batAPriceFeedAddress)).toEqual(true);

  expect(ethAPriceFeedAddress.toLowerCase()).toEqual(PIP_ETH);
  expect(batAPriceFeedAddress.toLowerCase()).toEqual(PIP_BAT);

  const promise1 = maker.latest(PRICE_FEED_ADDRESS, 'FOO');
  await expect(promise1).rejects.toThrow(/no collateral type/i);

  const promise2 = maker.latest(PRICE_FEED_ADDRESS, '');
  await expect(promise2).rejects.toThrow(/invalid collateral/i);
});

test(LIQUIDATION_RATIO, async () => {
  const ethALiquidationRatio = await maker.latest(LIQUIDATION_RATIO, 'ETH-A');
  const batALiquidationRatio = await maker.latest(LIQUIDATION_RATIO, 'BAT-A');

  expect(ethALiquidationRatio.symbol).toEqual('USD/MDAI');
  expect(batALiquidationRatio.symbol).toEqual('USD/MDAI');

  expect(ethALiquidationRatio.toNumber()).toEqual(1.5);
  expect(batALiquidationRatio.toNumber()).toEqual(2.0);

  const promise1 = maker.latest(LIQUIDATION_RATIO, 'FOO');
  await expect(promise1).rejects.toThrow(/no collateral type/i);

  const promise2 = maker.latest(LIQUIDATION_RATIO, '');
  await expect(promise2).rejects.toThrow(/invalid collateral/i);
});

test(RATIO_DAI_USD, async () => {
  const ratio = await maker.latest(RATIO_DAI_USD);
  expect(ratio.symbol).toEqual('MDAI/USD');
  expect(ratio.toNumber()).toEqual(1);
});
