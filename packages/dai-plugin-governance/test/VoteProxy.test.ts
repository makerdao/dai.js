import {
  setupTestMakerInstance,
  linkAccounts,
  restoreSnapshotOriginal,
  sleep
} from './helpers';
import VoteProxy from '../src/VoteProxy';

let maker, addresses, voteProxyService;

describe('VoteProxy', () => {
  beforeAll(async () => {
    maker = await setupTestMakerInstance();

    voteProxyService = maker.service('voteProxy');

    addresses = maker
      .listAccounts()
      .reduce((acc, cur) => ({ ...acc, [cur.name]: cur.address }), {});

    await linkAccounts(maker, addresses.ali, addresses.ava);
  }, 60000);

  afterAll(async () => {
    if (global.useOldChain) {
      await restoreSnapshotOriginal(global.snapshotId);
      return;
    } else {
      global.client.restoreSnapshot(
        global.testchainId,
        global.defaultSnapshotId
      );
      await sleep(15000);

      await global.client.delete(global.testchainId);
      await sleep(15000);

      return;
    }
  }, 60000);

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
  }, 60000);
});
