import Web3ServiceList from '../src/utils/Web3ServiceList';
import { takeSnapshot, restoreSnapshot } from './helpers/ganache';

beforeEach(() => {
  jest.setTimeout(10000);
});

afterEach(() => {
  return Web3ServiceList.disconnectAll();
});

let snapshotId;

beforeAll(async () => {
  snapshotId = await takeSnapshot();
});

afterAll(async () => {
  await restoreSnapshot(snapshotId);
});
