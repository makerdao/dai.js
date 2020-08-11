import {
  setupTestMakerInstance,
  restoreSnapshotOriginal,
  sleep,
  linkAccounts
} from './helpers';
import GovPollingService from '../src/GovPollingService';
import {
  dummyMkrSupportData,
  dummyAllPollsData,
  dummyOption,
  dummyAllOptions,
  allOptionsExpect,
  dummyWeight,
  dummyNumUnique,
  dummyBallotNoMajority,
  dummyBallotNoMajorityExpect,
  dummyBallotWithMajority,
  dummyBallotWithMajorityExpect,
  dummyBallotMultipleRounds,
  dummyBallotMultipleRoundsExpect
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
  const POLL_ID = [0];
  const OPTION_ID = [3];
  const txo = await govPollingService.vote(POLL_ID, OPTION_ID);
  const loggedOptionId = parseInt(txo.receipt.logs[0].topics[3]);
  // this will fail if the event was not emitted
  expect(loggedOptionId).toBe(OPTION_ID[0]);
});

test('can vote in batches', async () => {
  const POLL_IDS = [0, 1];
  const OPTION_IDS = [3, 4];
  const txo = await govPollingService.vote(POLL_IDS, OPTION_IDS);
  const loggedOptionIds = [
    parseInt(txo.receipt.logs[0].topics[3]),
    parseInt(txo.receipt.logs[1].topics[3])
  ];
  // this will fail if the event was not emitted
  expect(loggedOptionIds[0]).toBe(OPTION_IDS[0]);
  expect(loggedOptionIds[1]).toBe(OPTION_IDS[1]);
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

test('getMkrAmtVotedRankedChoice', async () => {
  govQueryApiService.getMkrSupportRankedChoice = jest.fn(
    () => dummyBallotWithMajority
  );
  govPollingService._getPoll = jest.fn(() => ({
    endDate: 123
  }));
  const amount = await govPollingService.getMkrAmtVotedRankedChoice();
  expect(amount.toNumber()).toBe(
    parseFloat(dummyBallotWithMajorityExpect.totalMkrParticipation)
  );
});

test('getOptionVotingFor', async () => {
  const mockFn = jest.fn(async () => dummyOption);
  govQueryApiService.getOptionVotingFor = mockFn;
  const option = await govPollingService.getOptionVotingFor('0xaddress', 1);
  expect(mockFn).toBeCalled();
  expect(option).toEqual(dummyOption);
});

test('getAllOptionsVotingFor', async () => {
  const mockFn = jest.fn(async () => dummyAllOptions);
  govQueryApiService.getAllOptionsVotingFor = mockFn;
  const options = await govPollingService.getAllOptionsVotingFor('0xaddress');
  expect(mockFn).toBeCalled();
  expect(options).toEqual(allOptionsExpect);
});

test('getNumUniqueVoters', async () => {
  const mockFn = jest.fn(async () => dummyNumUnique);
  govQueryApiService.getNumUniqueVoters = mockFn;
  const option = await govPollingService.getNumUniqueVoters(1);
  expect(mockFn).toBeCalled();
  expect(option).toEqual(dummyNumUnique);
});

test('getMkrWeight with cache', async () => {
  const mockFn = jest.fn(async () => dummyWeight);
  govQueryApiService.getMkrWeight = mockFn;
  const weight = await govPollingService.getMkrWeight('0xaddress');
  expect(mockFn).toBeCalled();
  expect(weight).toEqual(MKR(dummyWeight));
});

test('getMkrWeight from blockchain without cache', async () => {
  const currentAccount = maker.currentAccount().address;
  await linkAccounts(maker, currentAccount, maker.listAccounts()[1].address);
  const weightObject = await govPollingService.getMkrWeightFromChain(
    currentAccount
  );
  expect(weightObject).toEqual({
    chiefBalance: MKR(0),
    linkedChiefBalance: MKR(0),
    linkedMkrBalance: MKR(0),
    mkrBalance: MKR(400),
    proxyChiefBalance: MKR(0),
    total: MKR(400)
  });
});

test('getWinningProposal', async () => {
  const mockFn = jest.fn(async () => dummyMkrSupportData);
  govQueryApiService.getMkrSupport = mockFn;
  const option = await govPollingService.getWinningProposal(1);
  expect(mockFn).toBeCalled();
  expect(option).toBe(2);
});

test('getPercentageMkrVoted', async () => {
  const mockFn = jest.fn(async () => dummyMkrSupportData);
  govQueryApiService.getMkrSupport = mockFn;
  const percentage = await govPollingService.getPercentageMkrVoted(1);
  expect(mockFn).toBeCalled();
  expect(percentage).toBe(40);
});

test('getPercentageMkrVotedRankedChoice', async () => {
  govQueryApiService.getMkrSupportRankedChoice = jest.fn(
    () => dummyBallotWithMajority
  );
  govPollingService._getPoll = jest.fn(() => ({
    endDate: 123
  }));
  const percentage = await govPollingService.getPercentageMkrVotedRankedChoice();
  const mkrSupply = await maker
    .service('token')
    .getToken(MKR)
    .totalSupply();
  expect(percentage).toBe(
    MKR(dummyBallotWithMajorityExpect.totalMkrParticipation)
      .div(mkrSupply.toNumber())
      .times(100)
      .toNumber()
  );
});

test('ranked choice tally with majority', async () => {
  govQueryApiService.getMkrSupportRankedChoice = jest.fn(
    () => dummyBallotWithMajority
  );
  govPollingService._getPoll = jest.fn(() => ({
    endDate: 123
  }));
  const tally = await govPollingService.getTallyRankedChoiceIrv();

  expect(JSON.stringify(tally)).toBe(
    JSON.stringify(dummyBallotWithMajorityExpect)
  );
});

test('ranked choice tally with no majority', async () => {
  govQueryApiService.getMkrSupportRankedChoice = jest.fn(
    () => dummyBallotNoMajority
  );
  govPollingService._getPoll = jest.fn(() => ({
    endDate: 123
  }));
  const tally = await govPollingService.getTallyRankedChoiceIrv();

  expect(JSON.stringify(tally)).toBe(
    JSON.stringify(dummyBallotNoMajorityExpect)
  );
});

test('ranked choice tally with multiple rounds', async () => {
  govQueryApiService.getMkrSupportRankedChoice = jest.fn(
    () => dummyBallotMultipleRounds
  );
  govPollingService._getPoll = jest.fn(() => ({
    endDate: 123
  }));
  const tally = await govPollingService.getTallyRankedChoiceIrv();

  expect(JSON.stringify(tally)).toBe(
    JSON.stringify(dummyBallotMultipleRoundsExpect)
  );
});

test('can get vote logs from contract', async () => {
  const START_DATE = Math.floor(new Date().getTime() / 1000) + 100;
  const END_DATE = START_DATE + 5000;
  const MULTI_HASH = 'dummy hash';
  const URL = 'dummy url';
  const option = [1];
  const pollId = await govPollingService.createPoll(
    START_DATE,
    END_DATE,
    MULTI_HASH,
    URL
  );
  await govPollingService.vote([pollId], [option]);
  const voteLogs = await govPollingService.getVoteLogs();
  expect(voteLogs[0].topics.length).toBe(4);
});
