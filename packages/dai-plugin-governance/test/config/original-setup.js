import { takeSnapshotOriginal } from '../helpers';

beforeAll(async done => {
  global.useOldChain = true;
  global.snapshotId = await takeSnapshotOriginal();
  done();
});
