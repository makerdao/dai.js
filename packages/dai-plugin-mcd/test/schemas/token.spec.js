import { mcdMaker } from '../helpers';
import {
  takeSnapshot,
  restoreSnapshot,
  mineBlocks,
  TestAccountProvider
} from '@makerdao/test-helpers';
import { ETH, BAT, MDAI, MWETH, ALLOWANCE_AMOUNT } from '../../src';
import BigNumber from 'bignumber.js';
import { ServiceRoles } from '../../src/constants';

import {
  TOKEN_BALANCE,
  TOKEN_ALLOWANCE,
  ADAPTER_BALANCE
} from '../../src/schemas';

import tokenSchemas from '../../src/schemas/token';

let maker, snapshotData, address, address2, proxyAddress;

const ETH_A_COLLATERAL_AMOUNT = ETH(1);
const ETH_A_DEBT_AMOUNT = MDAI(1);

const BAT_A_COLLATERAL_AMOUNT = BAT(1);
const BAT_A_DEBT_AMOUNT = MDAI(1);

beforeAll(async () => {
  maker = await mcdMaker({
    cdpTypes: [
      { currency: ETH, ilk: 'ETH-A' },
      { currency: BAT, ilk: 'BAT-A' }
    ],
    multicall: {
      latestDebounceTime: 100
    }
  });

  snapshotData = await takeSnapshot(maker);
  maker.service('multicall').createWatcher();
  maker.service('multicall').registerSchemas(tokenSchemas);
  maker.service('multicall').start();
  address = maker.currentAddress();
  address2 = TestAccountProvider.nextAccount().address;
  proxyAddress = await maker.service('proxy').ensureProxy();
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(TOKEN_BALANCE, async () => {
  expect.assertions(8);

  const ethBalance = await maker.latest(TOKEN_BALANCE, address2, 'ETH');
  const batBalance = await maker.latest(TOKEN_BALANCE, address, 'BAT');

  expect(ethBalance.symbol).toEqual('ETH');
  expect(batBalance.symbol).toEqual('BAT');
  expect(ethBalance.toBigNumber()).toEqual(BigNumber('100'));
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
  await mineBlocks(maker.service('token'));

  const setBatAllowance = await maker.latest(
    TOKEN_ALLOWANCE,
    address,
    proxyAddress,
    'BAT'
  );

  expect(BigNumber.isBigNumber(setBatAllowance)).toEqual(true);
  expect(setBatAllowance).toEqual(BigNumber(ALLOWANCE_AMOUNT));
});

test(`${TOKEN_ALLOWANCE} for ETH`, async () => {
  const ethAllowance = await maker.latest(
    TOKEN_ALLOWANCE,
    address,
    proxyAddress,
    'ETH'
  );

  expect(BigNumber.isBigNumber(ethAllowance)).toEqual(true);
  expect(ethAllowance).toEqual(BigNumber(ALLOWANCE_AMOUNT));
});

test(ADAPTER_BALANCE, async () => {
  const mgr = await maker.service(ServiceRoles.CDP_MANAGER);
  await mgr.openLockAndDraw(
    'ETH-A',
    ETH_A_COLLATERAL_AMOUNT,
    ETH_A_DEBT_AMOUNT
  );
  await mgr.openLockAndDraw(
    'BAT-A',
    BAT_A_COLLATERAL_AMOUNT,
    BAT_A_DEBT_AMOUNT
  );

  const ethAdapterBalance = await maker.latest(ADAPTER_BALANCE, 'ETH-A');
  const batAdapterBalance = await maker.latest(ADAPTER_BALANCE, 'BAT-A');

  expect(ethAdapterBalance.symbol).toEqual(MWETH.symbol);
  expect(batAdapterBalance.symbol).toEqual(BAT.symbol);

  expect(ethAdapterBalance.toBigNumber()).toEqual(BigNumber('1'));
  expect(batAdapterBalance.toBigNumber()).toEqual(BigNumber('1'));
  await restoreSnapshot(snapshotData, maker);
});
