import {
  setupTestMakerInstance,
  restoreSnapshotOriginal,
  sleep
} from './helpers';

let maker, spellService;

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

//NOTE: these tests use mainnet instead of the testchain, because the
// testchain doesn't have spells (that have been executed) yet
describe('use mainnet', () => {
  beforeAll(async () => {
    jest.setTimeout(10000);
    maker = await setupTestMakerInstance('mainnet');
    spellService = maker.service('spell');
    jest.setTimeout(20000);
  });

  test('get spell execution date', async () => {
    const date = await spellService.getExecutionDate(
      '0x48916a2b11fa7a895426eedf9acf2d70523b1677'
    );
    expect(date).toEqual(new Date('2020-02-04T11:35:48.000Z'));
  });

  test('get date spell was scheduled', async () => {
    const date = await spellService.getScheduledDate(
      '0x48916a2b11fa7a895426eedf9acf2d70523b1677'
    );
    expect(date).toEqual(new Date('2020-02-04T11:34:53.000Z'));
  });

  test('get spell eta', async () => {
    const eta = await spellService.getEta(
      '0xf880d43bb9a32dd212c77b82a7336be31ecaee08'
    );
    expect(eta).toEqual(new Date('2020-01-26T11:53:19.000Z'));
  });

  test('get spell expiration', async () => {
    const eta = await spellService.getExpiration(
      '0x9400d4D59134af2a48a4bf4237E809A80f90Fe63'
    );
    expect(eta).toEqual(new Date('2021-11-07T20:22:48.000Z'));
  });

  //TODO: add test for getNextCastTime();

  test('get executive hash text', async () => {
    const done = await spellService.getExecutiveHash(
      '0x9400d4D59134af2a48a4bf4237E809A80f90Fe63'
    );
    expect(done).toBe(
      '0xe1126241f8df6e094363eac12a5c4620f0dbf54c4d7da7fa94f5b8dd499e30d2'
    );
  });

  test('get office hours', async () => {
    const done = await spellService.getOfficeHours(
      '0x9400d4D59134af2a48a4bf4237E809A80f90Fe63'
    );
    expect(done).toBe(true);
  });

  test('get spell done boolean', async () => {
    const done = await spellService.getDone(
      '0xf880d43bb9a32dd212c77b82a7336be31ecaee08'
    );
    expect(done).toBe(true);
  });

  test('get spell action address', async () => {
    const action = await spellService.getAction(
      '0xf880d43bb9a32dd212c77b82a7336be31ecaee08'
    );
    expect(action).toBe('0x68D4e46c1ca8a346f82e36f324A9C0935041De79');
  });
});

describe('use testchain', () => {
  beforeAll(async () => {
    maker = await setupTestMakerInstance();
    spellService = maker.service('spell');
  });

  xtest('get delay', async () => {
    const delay = await spellService.getDelayInSeconds();
    expect(delay.toNumber()).toBe(1);
  });
});
