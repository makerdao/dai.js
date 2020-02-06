import { mcdMaker } from '../helpers';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import BigNumber from 'bignumber.js';

import {
  ANNUAL_STABILITY_FEE,
  DATE_STABILITY_FEES_LAST_LEVIED,
  BASE_COLLATERAL_FEE
} from '../../src/schemas';

import jugSchemas from '../../src/schemas/jug';

let maker, snapshotData;

beforeAll(async () => {
  maker = await mcdMaker({
    multicall: true
  });

  snapshotData = await takeSnapshot(maker);
  maker.service('multicall').createWatcher();
  maker.service('multicall').registerSchemas(jugSchemas);
  maker.service('multicall').start();
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(ANNUAL_STABILITY_FEE, async () => {
  const expected = 0.04999999999989363;
  const annualStabilityFee = await maker.latest(ANNUAL_STABILITY_FEE, 'ETH-A');
  expect(annualStabilityFee.toNumber()).toEqual(expected);
});

test(DATE_STABILITY_FEES_LAST_LEVIED, async () => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const dateStabilityFeesLastLevied = await maker.latest(
    DATE_STABILITY_FEES_LAST_LEVIED,
    'ETH-A'
  );

  expect(dateStabilityFeesLastLevied instanceof Date).toEqual(true);
  expect(timestamp - dateStabilityFeesLastLevied).toBeLessThanOrEqual(10);
});

test(BASE_COLLATERAL_FEE, async () => {
  const baseCollateralFee = await maker.latest(BASE_COLLATERAL_FEE);
  expect(baseCollateralFee).toEqual(BigNumber('0'));
});
