import Web3ServiceList from '../src/utils/Web3ServiceList';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';

beforeEach(() => {
  jest.setTimeout(10000);
});

afterEach(() => {
  return Web3ServiceList.disconnectAll();
});

let snapshotData;

beforeAll(async () => {
  snapshotData = await takeSnapshot();
});

afterAll(async () => {
  await restoreSnapshot(snapshotData);
});
