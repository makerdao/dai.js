import {
  setupTestMakerInstance,
  restoreSnapshotOriginal,
  sleep
} from './helpers';
import SpellService from '../src/SpellService';

let maker, spellService;
beforeAll(async () => {
  maker = await setupTestMakerInstance('mainnet');
  spellService = maker.service('spell');
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

test('can create spell Service', async () => {
  expect(spellService).toBeInstanceOf(SpellService);
});

test('get delay', async () => {
  const delay = await spellService.getDelayInSeconds();
  expect(delay.toNumber()).toBe(1);
});

//currently this test works for mainnet
test('get spell eta', async () => {
  const eta = await spellService.getEta(
    '0xf880d43bb9a32dd212c77b82a7336be31ecaee08'
  );
  expect(eta).toEqual(new Date(1580039599000));
});

//currently this test works for mainnet
test('get spell done boolean', async () => {
  const done = await spellService.getDone(
    '0xf880d43bb9a32dd212c77b82a7336be31ecaee08'
  );
  expect(done).toBe(true);
});

//currently this test works for mainnet
test('get spell action address', async () => {
  const action = await spellService.getAction(
    '0xf880d43bb9a32dd212c77b82a7336be31ecaee08'
  );
  expect(action).toBe('0x68D4e46c1ca8a346f82e36f324A9C0935041De79');
});
