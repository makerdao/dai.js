import { mcdMaker } from '../helpers';
import {
  takeSnapshot,
  restoreSnapshot,
  TestAccountProvider
} from '@makerdao/test-helpers';
import { isValidAddressString } from '../../src/utils';

import schemas, { PROXY_ADDRESS } from '../../src/schemas';

let maker, address, address2, snapshotData;
beforeAll(async () => {
  maker = await mcdMaker({ multicall: true });
  snapshotData = await takeSnapshot(maker);
  maker.service('multicall').createWatcher({ interval: 'block' });
  maker.service('multicall').registerSchemas(schemas);
  maker.service('multicall').start();

  address = maker.service('web3').currentAddress();
  const account = TestAccountProvider.nextAccount();
  await maker.addAccount({ ...account, type: 'privateKey' });
  maker.useAccount(account.address);
  address2 = maker.service('web3').currentAddress();
  await maker.service('proxy').ensureProxy();
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(PROXY_ADDRESS, async () => {
  const proxyAddress1 = await maker.latest(PROXY_ADDRESS, address);
  expect(isValidAddressString(proxyAddress1)).toEqual(true);
  expect(proxyAddress1).toEqual('0x570074CCb147ea3dE2E23fB038D4d78324278886');

  const proxyAddress2 = await maker.latest(PROXY_ADDRESS, address2);
  expect(isValidAddressString(proxyAddress2)).toEqual(true);
  expect(proxyAddress2).toEqual('0xa029495c24518097170824CDD905351BdD938e52');
});
