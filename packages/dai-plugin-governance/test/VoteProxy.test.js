import {
  setupTestMakerInstance,
  linkAccounts,
  restoreSnapshotOriginal,
  sleep
} from './helpers';
import VoteProxy from '../src/VoteProxy';

let maker, addresses, voteProxyService;

jest.setTimeout(60000);

beforeAll(async () => {
  maker = await setupTestMakerInstance();

  voteProxyService = maker.service('voteProxy');

  addresses = maker
    .listAccounts()
    .reduce((acc, cur) => ({ ...acc, [cur.name]: cur.address }), {});

  await linkAccounts(maker, addresses.ali, addresses.ava);
});

afterAll(async done => {
  if (global.useOldChain) {
    await restoreSnapshotOriginal(global.snapshotId);
    done();
  } else {
    global.client.restoreSnapshot(global.testchainId, global.defaultSnapshotId);
    await sleep(15000);

    await global.client.delete(global.testchainId);
    await sleep(15000);

    done();
  }
});

test('Vote proxy instance returns correct information about itself', async () => {
  const { voteProxy } = await voteProxyService.getVoteProxy(addresses.ali);
  expect(voteProxy).toBeInstanceOf(VoteProxy);

  const vpAddress = voteProxy.getProxyAddress();
  expect(vpAddress).toBeTruthy();

  // Hot address should be the same as the approver
  const hotAddress = voteProxy.getHotAddress();
  expect(hotAddress.toLowerCase()).toBe(addresses.ava.toLowerCase());

  // Cold address should be the same as the initiator
  const coldAddress = voteProxy.getColdAddress();
  expect(coldAddress.toLowerCase()).toBe(addresses.ali.toLowerCase());
});
