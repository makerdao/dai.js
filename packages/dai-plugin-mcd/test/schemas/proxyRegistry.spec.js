import { mcdMaker } from '../helpers';
import {
  takeSnapshot,
  restoreSnapshot,
  TestAccountProvider
} from '@makerdao/test-helpers';
import { isValidAddressString } from '../../src/utils';

import schemas, { PROXY_ADDRESS } from '../../src/schemas';

let maker, snapshotData, address, address2, proxyAddress, proxyAddress2;

beforeAll(async () => {
  maker = await mcdMaker({ multicall: true });
  snapshotData = await takeSnapshot(maker);
  maker.service('multicall').createWatcher();
  maker.service('multicall').registerSchemas(schemas);
  maker.service('multicall').start();

  address = maker.service('web3').currentAddress();
  proxyAddress = await maker.service('proxy').currentProxy();
  const account = TestAccountProvider.nextAccount();
  await maker.addAccount({ ...account, type: 'privateKey' });
  maker.useAccount(account.address);
  address2 = maker.service('web3').currentAddress();
  proxyAddress2 = await maker.service('proxy').ensureProxy();
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(PROXY_ADDRESS, async () => {
  const proxy1 = await maker.latest(PROXY_ADDRESS, address);
  expect(isValidAddressString(proxy1)).toEqual(true);
  expect(proxy1).toEqual(proxyAddress);

  const proxy2 = await maker.latest(PROXY_ADDRESS, address2);
  expect(isValidAddressString(proxy2)).toEqual(true);
  expect(proxy2).toEqual(proxyAddress2);
});

test(`${PROXY_ADDRESS} using invalid account address`, async () => {
  const promise = maker.latest(PROXY_ADDRESS, '0xfoobar');
  await expect(promise).rejects.toThrow(/invalid/i);
});

test(`${PROXY_ADDRESS} using account with no proxy`, async () => {
  const proxy = await maker.latest(
    PROXY_ADDRESS,
    '0x1111111111111111111111111111111111111111'
  );
  expect(proxy).toBeNull();
});
