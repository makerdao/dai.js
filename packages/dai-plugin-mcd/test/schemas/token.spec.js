import { mcdMaker } from '../helpers';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { ETH, BAT, ALLOWANCE_AMOUNT } from '../../src';
import BigNumber from 'bignumber.js';

import { TOKEN_BALANCE, TOKEN_ALLOWANCE } from '../../src/schemas';

import tokenSchemas from '../../src/schemas/token';

let maker, snapshotData, address, proxyAddress;

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
  proxyAddress = await maker.service('proxy').ensureProxy();
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(TOKEN_BALANCE, async () => {
  expect.assertions(8);

  const ethBalance = await maker.latest(TOKEN_BALANCE, address, 'ETH');
  const batBalance = await maker.latest(TOKEN_BALANCE, address, 'BAT');

  expect(ethBalance.symbol).toEqual('ETH');
  expect(batBalance.symbol).toEqual('BAT');
  expect(ethBalance.toBigNumber()).toEqual(BigNumber('94.69019922'));
  expect(batBalance.toBigNumber()).toEqual(BigNumber('1000'));

  const daiBalance = await maker.latest(TOKEN_BALANCE, address, 'DAI');
  const wethBalance = await maker.latest(TOKEN_BALANCE, address, 'WETH');

  expect(daiBalance.symbol).toEqual('MDAI');
  expect(wethBalance.symbol).toEqual('MWETH');

  try {
    await maker.latest(TOKEN_BALANCE, address, 'NON_MCD_TOKEN');
  } catch (e) {
    expect(e).toEqual(
      Error('NON_MCD_TOKEN token is not part of the default tokens list')
    );
  }

  try {
    await maker.latest(TOKEN_BALANCE, address, 'DSR-DAI');
  } catch (e) {
    expect(e).toEqual(
      Error(
        "Balance of DAI in savings cannot be retrieved from a token contract call. To get DAI balance in savings call 'balance('DSR-DAI')'"
      )
    );
  }
});

test(TOKEN_ALLOWANCE, async () => {
  const unsetBatAllowance = await maker.latest(
    TOKEN_ALLOWANCE,
    address,
    proxyAddress,
    'BAT'
  );

  expect(BigNumber.isBigNumber(unsetBatAllowance)).toEqual(true);
  expect(unsetBatAllowance).toEqual(BigNumber('0'));

  await maker
    .service('token')
    .getToken('BAT')
    .approveUnlimited(proxyAddress);

  const setBatAllowance = await maker.latest(
    TOKEN_ALLOWANCE,
    address,
    proxyAddress,
    'BAT'
  );

  expect(BigNumber.isBigNumber(setBatAllowance)).toEqual(true);
  expect(setBatAllowance).toEqual(BigNumber(ALLOWANCE_AMOUNT));
});
