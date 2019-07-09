import { takeSnapshot, restoreSnapshot } from './helpers/ganache';

beforeEach(() => {
  jest.setTimeout(10000);
});

let snapshotId;

beforeAll(async () => {
  snapshotId = await takeSnapshot();
});

afterAll(async () => {
  await restoreSnapshot(snapshotId);
});
