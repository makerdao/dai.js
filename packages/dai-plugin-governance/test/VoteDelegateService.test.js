import {
  restoreSnapshotOriginal,
  setupTestMakerInstance,
  sendMkrToAddress,
  sleep
} from './helpers';
import VoteDelegateService from '../src/VoteDelegateService';
import VoteDelegate from '../src/VoteDelegate';
import { createCurrency } from '@makerdao/currency';

const MKR = createCurrency('MKR');
const IOU = createCurrency('IOU');

let maker,
  vds,
  vdfs,
  addresses,
  delegateAddress,
  delegateContractAddress,
  chiefService;

beforeAll(async () => {
  maker = await setupTestMakerInstance();
  vds = maker.service('voteDelegate');
  vdfs = maker.service('voteDelegateFactory');
  chiefService = maker.service('chief');

  addresses = maker
    .listAccounts()
    .reduce((acc, cur) => ({ ...acc, [cur.name]: cur.address }), {});

  delegateAddress = maker.currentAccount().address;
  await vdfs.createDelegateContract();
});

afterAll(async () => {
  if (global.useOldChain) {
    await restoreSnapshotOriginal(global.snapshotId);
    return;
  } else {
    global.client.restoreSnapshot(global.testchainId, global.defaultSnapshotId);
    await sleep(15000);

    await global.client.delete(global.testchainId);
    await sleep(15000);

    return;
  }
});

test('can create vote delegate service', async () => {
  expect(vds).toBeInstanceOf(VoteDelegateService);
});

test('getVoteDelegate returns the vote delegate if exists', async () => {
  const { hasDelegate, voteDelegate } = await vds.getVoteDelegate(
    delegateAddress
  );

  // Cache the delegateContractAddress for later
  delegateContractAddress = voteDelegate.getVoteDelegateAddress();

  expect(hasDelegate).toBe(true);
  expect(voteDelegate).toBeInstanceOf(VoteDelegate);
});

test('user can lock MKR with a delegate', async () => {
  const sendAmount = 5;
  const amountToLock = 3;

  await sendMkrToAddress(maker, addresses.owner, addresses.ali, sendAmount);

  maker.useAccount('ali');
  const mkr = await maker.getToken(MKR);

  await mkr.approveUnlimited(delegateContractAddress);

  // No deposits prior to locking maker
  const preLockDeposits = await chiefService.getNumDeposits(
    delegateContractAddress
  );
  expect(preLockDeposits.toNumber()).toBe(0);

  await vds.lock(delegateContractAddress, amountToLock);

  const postLockDeposits = await chiefService.getNumDeposits(
    delegateContractAddress
  );
  expect(postLockDeposits.toNumber()).toBe(amountToLock);
});

test("can check a user's delegated stake", async () => {
  const stakedAmt = 3;
  const deposits = await vds.getStakedBalanceForAddress(
    delegateContractAddress,
    maker.currentAccount().address
  );

  expect(deposits.toNumber()).toBe(stakedAmt);
});

test('delegate can cast an executive vote and retrieve voted on addresses from slate', async () => {
  maker.useAccountWithAddress(delegateAddress);

  //TODO: check fetching delegate contract address with a user's current address

  const picks = [
    '0x26EC003c72ebA27749083d588cdF7EBA665c0A1D',
    '0x54F4E468FB0297F55D8DfE57336D186009A1455a'
  ];

  await vds.voteExec(delegateContractAddress, picks);

  const addressesVotedOn = await vds.getVotedProposalAddresses(
    delegateContractAddress
  );
  expect(addressesVotedOn).toEqual(picks);
});

test('delegate can vote polls and see Voted event emitted', async () => {
  const POLL_IDS = [0, 1];
  const OPTION_IDS = [3, [1, 4]];
  const txo = await vds.votePoll(delegateContractAddress, POLL_IDS, OPTION_IDS);
  const loggedOptionIds = [
    parseInt(txo.receipt.logs[0].topics[3]),
    parseInt(txo.receipt.logs[1].topics[3])
  ];
  // this will fail if the event was not emitted
  expect(loggedOptionIds[0]).toBe(OPTION_IDS[0]);
  expect(loggedOptionIds[1]).toBe(1025);
});

test('user can free an amount of MKR from delegate', async () => {
  const amountToFree = 1;

  maker.useAccount('ali');
  const iou = await maker.getToken(IOU);

  await iou.approveUnlimited(delegateContractAddress);

  const preFreeDeposits = await chiefService.getNumDeposits(
    delegateContractAddress
  );
  await vds.free(delegateContractAddress, amountToFree);

  const postFreeDeposits = await chiefService.getNumDeposits(
    delegateContractAddress
  );

  expect(postFreeDeposits.toNumber()).toBe(
    preFreeDeposits.toNumber() - amountToFree
  );
});

test('getVoteProxy returns a null if none exists for a given address', async () => {
  const address = addresses.sam;
  const { hasDelegate, voteDelegate } = await vds.getVoteDelegate(address);

  expect(hasDelegate).toBe(false);
  expect(voteDelegate).toBeNull();
});

test('getMkrLockedDelegate calls equivalent govQueryApi method', async () => {
  const address = '0x16fb96a5fa0427af0c8f7cf1eb4870231c8154b6';
  const startTime = 0;
  const endTime = Math.floor(Date.now() / 1000);

  const queryService = vds.get('govQueryApi');
  const spy = jest.spyOn(queryService, 'getMkrLockedDelegate');

  await vds.getMkrLockedDelegate(address);

  expect(spy).toBeCalledWith(address, startTime, endTime);
});
