import { setupTestMakerInstance } from '../helpers';

let service;

jest.setTimeout(10000);

beforeAll(async () => {
  const maker = await setupTestMakerInstance('kovan');
  service = maker.service('govQueryApi');
});

test('get all active polls', async () => {
  const polls = await service.getAllWhitelistedPolls();
  console.log('polls', polls);
});

test('get unique voters', async () => {
  const num = await service.getNumUniqueVoters(1);
  console.log('numUnique', num);
});

test('get mkr weight', async () => {
  const weight = await service.getMkrWeight('address', 999999999);
  console.log('weight', weight);
}, 10000);

test('get current vote', async () => {
  const option = await service.getOptionVotingFor('0xv', 1);
  console.log('option', option);
});

test('get mkr weight by option', async () => {
  const weights = await service.getMkrSupport(1, 999999999);
  console.log('weights', weights);
});

test('get ranked choice mkr weight by option', async () => {
  const votes = await service.getMkrSupportRankedChoice(1, 999999999);
  console.log('votes', votes);
});

test('get block number', async () => {
  const num = await service.getBlockNumber(1511634513);
  console.log('num', num);
});

test('get esm joins', async () => {
  const joins = await service.getEsmJoins();
  console.log('joins', joins);
});

test('get all current votes', async () => {
  const options = await service.getAllOptionsVotingFor(
    '0xb93f14636678d680dcbbed20c77f2b6220b52c39'
  );
  console.log('options', options);
});

test('get all current votes for multiple addresses', async () => {
  const options = await service.getAllOptionsVotingForMany([
    '0xb93f14636678d680dcbbed20c77f2b6220b52c39',
    '0x18c22d3937d774e0af0214b28c34856ad0a23272'
  ]);
  console.log('options', options);
});

test('get MKR locked to a delegate over time', async () => {
  const events = await service.getMkrLockedDelegate(
    '0x845b36e1e4F41a361dD711Bda8ea239bF191fE95'
  );
  console.log('events', events);
});
