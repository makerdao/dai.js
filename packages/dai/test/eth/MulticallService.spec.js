import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';
import Maker from '../../src/index';
import BigNumber from 'bignumber.js';

import schemas, {
  TOTAL_CDP_DEBT,
  ETH_PRICE,
  CDP_COLLATERAL,
  CDP_DEBT,
  CDP_COLLATERAL_VALUE,
  LAST_CREATED_CDP_COLLATERAL_VALUE,
  CDP_OWNER
} from '../helpers/schemas';

let maker, multicall, watcher, address, cdpId1, cdpId2;

beforeAll(async () => {
  maker = await Maker.create('test', {
    web3: {
      pollingInterval: 100
    },
    multicall: {
      debounceTime: 1
    },
    log: false
  });
  await maker.authenticate();
  address = TestAccountProvider.nextAddress();
  multicall = maker.service('multicall');
  watcher = multicall.createWatcher();
  multicall.registerSchemas(schemas);

  const proxyAddress = await maker.service('proxy').ensureProxy();
  ({ id: cdpId1 } = {}) = await maker.service('cdp').openProxyCdpLockEthAndDrawDai(1, 100, proxyAddress); // prettier-ignore
  ({ id: cdpId2 } = {}) = await maker.service('cdp').openProxyCdpLockEthAndDrawDai(5, 100, proxyAddress); // prettier-ignore
  await maker.service('cdp').openProxyCdpLockEthAndDrawDai(1, 50, proxyAddress);
});

beforeEach(() => {
  multicall.start();
});

afterEach(() => {
  multicall.stop();
});

test('get eth balance via multicall', async () => {
  const web3 = multicall.get('web3');
  const fromWei = web3._web3.utils.fromWei;
  watcher.stop();
  const initialBlock = (await web3.getBlock('latest')).number + 1;
  const initialEthBalance = fromWei(await web3.getBalance(address)).toString();
  watcher.tap(() => [
    {
      call: ['getEthBalance(address)(uint256)', address],
      returns: [['ETH_BALANCE', v => fromWei(v.toString())]]
    }
  ]);
  watcher.start();
  const results = {};
  const batchSub = watcher.subscribe(update => (results[update.type] = update.value.toString()));
  const newBlockSub = watcher.onNewBlock(number => (results.blockNumber = number));
  await watcher.awaitInitialFetch();
  batchSub.unsub();
  newBlockSub.unsub();

  expect(results.ETH_BALANCE).toEqual(initialEthBalance);
  expect(parseInt(results.blockNumber)).toEqual(initialBlock);
});

test('base observable', async () => {
  const expectedTotalCdpDebt = BigNumber(250);
  const totalCdpDebt = await maker.latest(TOTAL_CDP_DEBT);
  expect(totalCdpDebt).toEqual(expectedTotalCdpDebt);
});

test('base observable with arg', async () => {
  const expectedCdpCollateral = BigNumber(1);
  const cdpCollateral = await maker.latest(CDP_COLLATERAL, cdpId1);
  expect(cdpCollateral).toEqual(expectedCdpCollateral);
});

test('multiple base observables', async () => {
  const expectedCdpCollateral = BigNumber(1);
  const expectedCdpDebt = BigNumber(100);
  const expectedEthPrice = BigNumber(400);

  const cdpCollateral = await maker.latest(CDP_COLLATERAL, cdpId1);
  const cdpDebt = await maker.latest(CDP_DEBT, cdpId1);
  const ethPrice = await maker.latest(ETH_PRICE);

  expect(cdpCollateral).toEqual(expectedCdpCollateral);
  expect(cdpDebt).toEqual(expectedCdpDebt);
  expect(ethPrice).toEqual(expectedEthPrice);
  expect(multicall.totalActiveSchemas).toEqual(2);
});

test('computed observable', async () => {
  const expectedCdpCollateralValue = BigNumber(400);
  const cdpCollateralValue = await maker.latest(CDP_COLLATERAL_VALUE, cdpId1);
  expect(cdpCollateralValue).toEqual(expectedCdpCollateralValue);
  expect(multicall.totalActiveSchemas).toEqual(2);
});

test('computed observable with nested dependencies', async () => {
  const expectedLastCreatedCdpDebt = BigNumber(400);
  const lastCreatedCdpDebt = await maker.latest(LAST_CREATED_CDP_COLLATERAL_VALUE);
  expect(lastCreatedCdpDebt).toEqual(expectedLastCreatedCdpDebt);
  expect(multicall.totalActiveSchemas).toEqual(3);
});

test('observable throws args validation error', async () => {
  const promise = maker.latest(CDP_COLLATERAL, -9000);
  await expect(promise).rejects.toThrow(/invalid cdp id/i);
});

test('observable throws invalid key error', () => {
  expect(() => {
    maker.latest(null);
  }).toThrow(/invalid observable key/i);
});

test('observable throws no registered schema error', () => {
  expect(() => {
    maker.latest('foo');
  }).toThrow(/no registered schema/i);
});

test('observable throws insufficient args error', async () => {
  const promise = maker.latest(CDP_OWNER);
  await expect(promise).rejects.toThrow(/expects.*argument/i);
});

test('observable throws result validation error', async () => {
  const promise = maker.latest(CDP_COLLATERAL, cdpId2);
  await expect(promise).rejects.toThrow(/Φ/);
});

test('observable throws result validation error 2', async () => {
  const promise = maker.latest(CDP_OWNER, 9000);
  await expect(promise).rejects.toThrow();
});
