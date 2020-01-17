import { sleep } from '../helpers';

const backendEnv = 'prod';
const defaultSnapshotId = '13219642453536798952'; // default for remote
const testchainUrl = 'http://18.185.172.121:4000';
const websocketUrl = 'ws://18.185.172.121:4000/socket';

// const backendEnv = 'dev';
// const defaultSnapshotId = '6925561923190355037'; // local
// const testchainUrl = process.env.TESTCHAIN_URL || 'http://localhost:4000';
// const websocketUrl = process.env.WEBSOCKET_URL || 'ws://127.1:4000/socket';

const testchainConfig = {
  accounts: 3,
  block_mine_time: 0,
  clean_on_stop: true,
  description: 'DaiPluginDefaultremote1',
  type: 'geth', // the restart testchain process doesn't work well with ganache
  snapshot_id: defaultSnapshotId
};
const startTestchain = async () => {
  const { Client, Event } = require('@makerdao/testchain-client');
  const client = new Client(testchainUrl, websocketUrl);

  global.client = client;
  await global.client.init();

  global.client.create(testchainConfig);
  const {
    payload: {
      response: { id }
    }
  } = await global.client.once('api', Event.OK);

  return id;
};

const setTestchainDetails = async id => {
  const {
    details: {
      chain_details: { rpc_url }
    }
  } = await global.client.api.getChain(id);

  global.backendEnv = backendEnv;
  global.defaultSnapshotId = defaultSnapshotId;
  global.testchainPort = rpc_url.substr(rpc_url.length - 4);
  global.testchainId = id;
  global.rpcUrl = rpc_url.includes('.local')
    ? `http://localhost:${global.testchainPort}`
    : rpc_url;
};

beforeAll(async () => {
  const id = await startTestchain();
  // sleep for 10 seconds while we wait for the chain to start up
  await sleep(10000);
  await setTestchainDetails(id);
});
