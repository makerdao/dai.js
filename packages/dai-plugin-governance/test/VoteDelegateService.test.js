import {
  setupTestMakerInstance,
  // sendMkrToAddress,
  // setUpAllowance,
  restoreSnapshotOriginal,
  sleep
} from './helpers';
import VoteDelegateService from '../src/VoteDelegateService';
// import VoteDelegate from '../src/VoteDelegate';

let maker, voteDelegateService;

beforeAll(async () => {
  // set to kovan until testchain is configued for delegation
  maker = await setupTestMakerInstance('kovan');

  voteDelegateService = maker.service('voteDelegate');
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

test('can create vote delegate service', async () => {
  expect(voteDelegateService).toBeInstanceOf(VoteDelegateService);
});
