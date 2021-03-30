import {
  setupTestMakerInstance,
  setUpAllowance,
  restoreSnapshotOriginal,
  sleep
} from './helpers';
import { ZERO_ADDRESS } from '../src/utils/constants';
import ChiefService from '../src/ChiefService';
import * as web3utils from 'web3-utils';

let maker, chiefService;

const picks = [
  '0x26EC003c72ebA27749083d588cdF7EBA665c0A1D',
  '0x54F4E468FB0297F55D8DfE57336D186009A1455a'
];

const mkrToLock = 3;

jest.setTimeout(60000);

beforeAll(async () => {
  maker = await setupTestMakerInstance();
  chiefService = maker.service('chief');

  maker.useAccount('owner');
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

test('can create Chief Service', async () => {
  expect(chiefService).toBeInstanceOf(ChiefService);
});

test('can cast vote with an array of addresses', async () => {
  // owner casts vote with picks array
  await chiefService.vote(picks);
  const slate = await chiefService.getVotedSlate(
    maker.currentAccount().address
  );

  const addrs = await chiefService.getSlateAddresses(slate);

  expect(addrs).toEqual(picks);
});

test('can cast vote with a slate hash', async () => {
  // etch the picks
  await chiefService.etch(picks);

  // hash the picks to get slate hash
  const hash = web3utils.soliditySha3({ type: 'address[]', value: picks });

  // cast a vote for the slate hash
  await chiefService.vote(hash);

  const slate = await chiefService.getVotedSlate(
    maker.currentAccount().address
  );
  expect(slate).toBe(hash);
  expect(slate).not.toBe(ZERO_ADDRESS);

  const addresses = await chiefService.getSlateAddresses(slate);

  expect(addresses).toEqual(picks);
});

test('number of deposits for a proxy contract address should equal locked MKR amount', async () => {
  await setUpAllowance(maker, chiefService._chiefContract().address);
  await chiefService.lock(mkrToLock);

  const numDeposits = await chiefService.getNumDeposits(
    maker.currentAccount().address
  );

  expect(numDeposits.toNumber()).toBe(mkrToLock);
});

test('approval count for a voted-on address should equal locked MKR amount', async () => {
  const approvalCount = await chiefService.getApprovalCount(picks[0]);
  expect(approvalCount.toNumber()).toBe(mkrToLock);
});

test('getVoteTally returns the vote tally', async () => {
  const voteTally = await chiefService.getVoteTally();

  expect.assertions(picks.length);
  picks.map(pick =>
    expect(Object.keys(voteTally).includes(pick.toLowerCase())).toBe(true)
  );
});

test('get hat should return lifted address', async () => {
  const addressToLift = picks[0];

  const oldHat = await chiefService.getHat();
  expect(oldHat).not.toBe(addressToLift);

  await chiefService.lift(addressToLift);

  const newHat = await chiefService.getHat();
  expect(newHat).toBe(addressToLift);
});

test.only('get detailed lock logs', async () => {
  const uint = '7549338754686726219464911';
  console.log(uint.toNumber());
  await setUpAllowance(maker, chiefService._chiefContract().address);
  await chiefService.lock(2);

  const lockLog = await chiefService.getDetailedLockLogs();

  const { sender, amount } = lockLog[0];
  expect(sender).toBe(maker.currentAddress());
  expect(amount.toNumber()).toBe(2);
});

test('get detailed free logs', async () => {
  const chiefAddress = chiefService._chiefContract().address;
  await setUpAllowance(maker, chiefAddress);
  await chiefService.lock(2);
  const iou = await maker.getToken('IOU');

  await iou.approveUnlimited(chiefAddress);
  await chiefService.free(1);

  const freeLog = await chiefService.getDetailedFreeLogs();

  const { sender, amount } = freeLog[0];
  expect(sender).toBe(maker.currentAddress());
  expect(amount.toNumber()).toBe(1);
});

test('get vote address logs', async () => {
  await chiefService.vote(picks);

  const voteAddressLog = await chiefService.getVoteAddressLogs();
  expect(voteAddressLog.length).toBe(2); // note modifier is hit twice for a vote(address[])

  const { sender, candidates } = voteAddressLog[0];
  expect(sender).toBe(maker.currentAddress());
  expect(candidates.map(t => t.toLowerCase())).toMatchObject(
    picks.map(t => t.toLowerCase())
  );
});

test('get vote slate logs', async () => {
  await chiefService.etch(picks);

  const hash = web3utils.soliditySha3({ type: 'address[]', value: picks });

  await chiefService.vote(hash);

  const voteSlateLog = await chiefService.getVoteSlateLogs();

  expect(voteSlateLog.length).toBe(1); // note modifier is hit only once for a vote(bytes32)

  const { sender, slate } = voteSlateLog[0];
  expect(sender).toBe(maker.currentAddress());
  expect(slate).toBe(hash);
});
