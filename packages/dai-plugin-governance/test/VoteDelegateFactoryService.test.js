import { restoreSnapshotOriginal, setupTestMakerInstance } from './helpers';
import VoteDelegateFactoryService from '../src/VoteDelegateFactoryService';

let maker, vdfs;

beforeAll(async () => {
  maker = await setupTestMakerInstance();
  vdfs = maker.service('voteDelegateFactory');
});

afterAll(async () => {
  await restoreSnapshotOriginal(global.snapshotId);
  return;
});

test('can create vote delegate factory service', async () => {
  expect(vdfs).toBeInstanceOf(VoteDelegateFactoryService);
});

test('can create a vote delegate contract', async () => {
  let isDelegate = await vdfs.isDelegate(maker.currentAccount().address);
  expect(isDelegate).toBe(false);

  await vdfs.createDelegateContract();

  isDelegate = await vdfs.isDelegate(maker.currentAccount().address);
  expect(isDelegate).toBe(true);
});
