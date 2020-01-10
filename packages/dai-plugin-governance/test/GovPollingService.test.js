import {
  setupTestMakerInstance,
  restoreSnapshotOriginal,
  sleep
} from './helpers';
import GovPollingService from '../src/GovPollingService';
import {
  dummyMkrSupportData,
  dummyAllPollsData,
  dummyBlockNumber,
  dummyOption,
  dummyWeight,
  dummyNumUnique
} from './fixtures';
import { MKR } from '../src/utils/constants';

let maker, govPollingService, govQueryApiService;

jest.setTimeout(60000);

beforeAll(async () => {
  maker = await setupTestMakerInstance();
  govPollingService = maker.service('govPolling');
  govQueryApiService = maker.service('govQueryApi');

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

test('can create Gov Polling Service', () => {
  expect(govPollingService).toBeInstanceOf(GovPollingService);
});

test('can create poll', async () => {
  const START_DATE = Math.floor(new Date().getTime() / 1000) + 100;
  const END_DATE = START_DATE + 5000;
  const MULTI_HASH = 'dummy hash';
  const URL = 'dummy url';
  const firstPollId = await govPollingService.createPoll(
    START_DATE,
    END_DATE,
    MULTI_HASH,
    URL
  );
  expect(firstPollId).not.toBeNaN();

  const secondPollId = await govPollingService.createPoll(
    START_DATE,
    END_DATE,
    MULTI_HASH,
    URL
  );
  expect(secondPollId).toBe(firstPollId + 1);
});

test('can vote', async () => {
  const OPTION_ID = 3;
  const txo = await govPollingService.vote(0, OPTION_ID);
  const loggedOptionId = parseInt(txo.receipt.logs[0].topics[3]);
  // this will fail if the event was not emitted
  expect(loggedOptionId).toBe(OPTION_ID);
});

test('can withdraw poll', async () => {
  const POLL_ID = 0;
  const txo = await govPollingService.withdrawPoll(POLL_ID);
  // slice off the zeros used to pad the address to 32 bytes
  const loggedCaller = txo.receipt.logs[0].topics[1].slice(26);
  const { address: activeAddress } = maker.currentAccount();
  // this will fail if the event was not emitted
  expect(loggedCaller).toBe(activeAddress.slice(2));
});

//--- caching tests

test('getAllWhitelistedPolls', async () => {
  const mockFn = jest.fn(async () => dummyAllPollsData);
  govQueryApiService.getAllWhitelistedPolls = mockFn;
  const polls = await govPollingService.getAllWhitelistedPolls();
  expect(mockFn).toBeCalled();
  expect(polls).toEqual(dummyAllPollsData);
});

test('getMkrAmtVoted', async () => {
  const mockFn = jest.fn(async () => dummyMkrSupportData);
  govQueryApiService.getMkrSupport = mockFn;
  govQueryApiService.getBlockNumber = jest.fn();
  const total = await govPollingService.getMkrAmtVoted(1);
  expect(mockFn).toBeCalled();
  expect(total).toEqual(MKR(160));
});

test('getOptionVotingFor', async () => {
  const mockFn = jest.fn(async () => dummyOption);
  govQueryApiService.getOptionVotingFor = mockFn;
  const option = await govPollingService.getOptionVotingFor('0xaddress', 1);
  expect(mockFn).toBeCalled();
  expect(option).toEqual(dummyOption);
});

test('getNumUniqueVoters', async () => {
  const mockFn = jest.fn(async () => dummyNumUnique);
  govQueryApiService.getNumUniqueVoters = mockFn;
  const option = await govPollingService.getNumUniqueVoters(1);
  expect(mockFn).toBeCalled();
  expect(option).toEqual(dummyNumUnique);
});

test('getMkrWeight', async () => {
  const mockFn = jest.fn(async () => dummyWeight);
  govQueryApiService.getMkrWeight = mockFn;
  const option = await govPollingService.getMkrWeight('0xaddress');
  expect(mockFn).toBeCalled();
  expect(option).toEqual(MKR(dummyWeight));
});

test('getWinningProposal', async () => {
  const mockFn = jest.fn(async () => dummyMkrSupportData);
  govQueryApiService.getMkrSupport = mockFn;
  const option = await govPollingService.getWinningProposal(1);
  expect(mockFn).toBeCalled();
  expect(option).toBe(2);
});

test('getVoteHistory', async () => {
  // clear polls cache
  govPollingService.refresh();
  const mockFn1 = jest.fn(async () => dummyAllPollsData);
  govQueryApiService.getAllWhitelistedPolls = mockFn1;
  const mockFn2 = jest.fn(async () => dummyMkrSupportData);
  govQueryApiService.getMkrSupport = mockFn2;
  const mockFn3 = jest.fn(async t => dummyBlockNumber(t));
  govQueryApiService.getBlockNumber = mockFn3;
  const history = await govPollingService.getVoteHistory(1, 3);
  expect(mockFn1).toBeCalled();
  expect(mockFn2).toBeCalled();
  expect(mockFn3).toBeCalled();
  expect(history[0].options).toBe(dummyMkrSupportData);
});

test('getPercentageMkrVoted', async () => {
  const mockFn = jest.fn(async () => dummyMkrSupportData);
  govQueryApiService.getMkrSupport = mockFn;
  const percentage = await govPollingService.getPercentageMkrVoted(1);
  expect(mockFn).toBeCalled();
  expect(percentage).toBe(40);
});
