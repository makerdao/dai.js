import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';

beforeEach(() => {
  jest.setTimeout(10000);
});

let snapshotData;

beforeAll(async () => {
  snapshotData = await takeSnapshot();
});

afterAll(async () => {
  await restoreSnapshot(snapshotData);
});
