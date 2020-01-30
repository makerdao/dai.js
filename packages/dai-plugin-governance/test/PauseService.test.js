import {
  setupTestMakerInstance,
  restoreSnapshotOriginal,
  sleep
} from './helpers';
import PauseService from '../src/PauseService';

let maker, pauseService;
beforeAll(async () => {
  maker = await setupTestMakerInstance();
  pauseService = maker.service('pause');
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

test('can create Pause Service', async () => {
  expect(pauseService).toBeInstanceOf(PauseService);
});

test('get delay', async () => {
  const delay = await pauseService.getDelayInSeconds();
  expect(delay.toNumber()).toBe(1);
});

//currently this test works for mainnet
xtest('get eta of hat', async () => {
  const eta = await pauseService.getEta('0xf880d43bb9a32dd212c77b82a7336be31ecaee08');
  expect(eta).toEqual(new Date(1580039599000));
});
