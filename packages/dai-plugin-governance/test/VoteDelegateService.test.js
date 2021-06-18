import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import govPlugin from '../src/index';
import Maker from '@makerdao/dai';
import VoteDelegateService from '../src/VoteDelegateService';
// import VoteDelegate from '../src/VoteDelegate';

let maker, voteDelegateService, network, snapshotData;

const kovanConfig = {
  plugins: [[govPlugin, { network }]],
  accounts: {
    owner: {
      type: 'privateKey',
      key: '0x474beb999fed1b3af2ea048f963833c686a0fba05f5724cb6417cf3b8ee9697e'
    }
  },
  web3: {
    transactionSettings: {
      gasPrice: 1000000000
    },
    provider: { infuraProjectId: 'c3f0f26a4c1742e0949d8eedfc47be67' }
  }
};

const testchainConfig = {
  plugins: [govPlugin, [{ network: 'testchain' }]],
  web3: {
    pollingInterval: 100
  }
};

async function makerInstance(preset) {
  const config = preset === 'kovan' ? kovanConfig : testchainConfig;
  const maker = await Maker.create(preset, config);
  await maker.authenticate();
  return maker;
}

beforeAll(async () => {
  // To run this test on kovan, just switch the network variables below:
  network = 'kovan';
  // network = 'test';
  maker = await makerInstance(network);
  voteDelegateService = maker.service('voteDelegate');
  if (network === 'test') snapshotData = await takeSnapshot(maker);
}, 60000);

afterAll(async () => {
  if (network === 'test') await restoreSnapshot(snapshotData, maker);
});

test('can create vote delegate service', async () => {
  expect(voteDelegateService).toBeInstanceOf(VoteDelegateService);
});

test('can create vote delegate service', async () => {
  expect(voteDelegateService).toBeInstanceOf(VoteDelegateService);
});

test('getVoteDelegate returns the vote delegate if exists', async () => {
  const { hasDelegate, voteDelegate } = await voteDelegateService.getVoteDelegate(
    maker.currentAccount().address
  );

  expect(hasDelegate).toBe(true);
  expect(voteDelegate).toBeTruthy();
});
