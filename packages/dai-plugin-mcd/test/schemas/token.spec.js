import { mcdMaker } from '../helpers';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { ETH, BAT } from '../../src';
import BigNumber from 'bignumber.js';

import { TOKEN_BALANCE, BALANCE } from '../../src/schemas';

import tokenSchemas from '../../src/schemas/token';

let maker, snapshotData, address;

beforeAll(async () => {
  maker = await mcdMaker({
    cdpTypes: [
      { currency: ETH, ilk: 'ETH-A' },
      { currency: BAT, ilk: 'BAT-A' }
    ],
    multicall: true
  });

  snapshotData = await takeSnapshot(maker);
  maker.service('multicall').createWatcher({ interval: 'block' });
  maker.service('multicall').registerSchemas(tokenSchemas);
  maker.service('multicall').start();
  address = maker.currentAddress();
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(TOKEN_BALANCE, async () => {
  const ethBalance = await maker.latest(TOKEN_BALANCE, address, 'ETH');
  const batBalance = await maker.latest(TOKEN_BALANCE, address, 'BAT');

  expect(ethBalance).toEqual(BigNumber('94.69019922'));
  expect(batBalance).toEqual(BigNumber('1000'));
});

test(BALANCE, async () => {
  const ethBalance = await maker.latest(BALANCE, 'ETH');
  const batBalance = await maker.latest(BALANCE, 'BAT');

  expect(ethBalance).toEqual(BigNumber('94.69019922'));
  expect(batBalance).toEqual(BigNumber('1000'));
});
