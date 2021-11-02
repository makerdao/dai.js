import { takeSnapshotOriginal } from '../helpers';

beforeAll(async () => {
  global.useOldChain = true;
  global.snapshotId = await takeSnapshotOriginal();
  return;
});
