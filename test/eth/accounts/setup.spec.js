import { setupEngine } from '../../../src/eth/accounts/setup.js';
import ProviderType from '../../../src/eth/web3/ProviderType';

const configBrowser = {
  web3: { provider: { type: ProviderType.BROWSER } }
};

const configHttp = {
  web3: { provider: { type: ProviderType.HTTP } }
};

const configWebsocket = {
  web3: { provider: { type: ProviderType.WEBSOCKET } }
};

const configInfuraHttp = {
  web3: {
    provider: {
      type: ProviderType.INFURA,
      network: 'kovan',
      protocol: 'https'
    }
  }
};

const configInfuraWebsocket = {
  web3: {
    provider: {
      type: ProviderType.INFURA,
      network: 'kovan',
      protocol: 'wss'
    }
  }
};

test('provider type browser will return correct', async () => {
  Object.assign(window, {
    web3: {
      currentProvider: {
        sendAsync: () => {}
      }
    }
  });

  const res = await setupEngine(configBrowser);
  expect(res.provider.isWindowProvider).toBe(true);
});

test('provider type http will return correct', async () => {
  const res = await setupEngine(configHttp);
  expect(res.provider.rpcUrl).toEqual('http://localhost:2000');
  expect(res.provider.constructor.name).toEqual('RpcSource');
});

test('provider type websocket will return correct', async () => {
  const res = await setupEngine(configWebsocket);
  expect(res.engine._providers[0].constructor.name).toEqual(
    'SubscriptionSubprovider'
  );
  expect(res.engine._providers[1].constructor.name).toEqual(
    'WebsocketSubprovider'
  );
});

test('provider type infura http will return correct', async () => {
  const res = await setupEngine(configInfuraHttp);
  expect(res.provider.rpcUrl).toEqual('https://kovan.infura.io');
  expect(res.provider.constructor.name).toEqual('RpcSource');
});

test('provider type infura ws will return correct', async () => {
  const res = await setupEngine(configInfuraWebsocket);
  expect(res.engine._providers[0].constructor.name).toEqual(
    'SubscriptionSubprovider'
  );
  expect(res.engine._providers[1].constructor.name).toEqual(
    'WebsocketSubprovider'
  );
});
