import DefaultServiceProvider from '../../src/config/DefaultServiceProvider';
import ProviderType from '../../src/eth/web3/ProviderType';
import { has, merge } from 'lodash';

export const kovanProviderConfig = {
  web3: {
    privateKey: process.env.KOVAN_PRIVATE_KEY,
    provider: {
      type: ProviderType.INFURA,
      network: 'kovan',
      infuraApiKey: process.env.INFURA_API_KEY
    }
  }
};
export const websocketProviderConfig = {
  web3: {
    provider: {
      type: ProviderType.WEBSOCKET,
      url: 'ws://localhost:2000'
    },
    transactionSettings: {
      gasLimit: 4000000
    },
    pollingInterval: 50
  },
  log: false
};

export const httpProviderConfig = {
  web3: {
    provider: {
      type: ProviderType.HTTP,
      url: 'http://localhost:2000'
    },
    transactionSettings: {
      gasLimit: 4000000
    },
    pollingInterval: 50
  },
  log: false
};

const cache = { storage: {} };

export function resetCache() {
  cache.storage = {};
}

export const defaultConfig = process.env.TEST_WS
  ? websocketProviderConfig
  : httpProviderConfig;

export function buildTestContainer(settings = {}) {
  let config = defaultConfig;
  if (has(settings, 'useHttp')) {
    config = settings.useHttp ? httpProviderConfig : websocketProviderConfig;
    delete settings.useHttp;
  }

  return new DefaultServiceProvider(merge({}, config, settings));
}

export function buildTestService(name, settings) {
  return buildTestContainer(settings).service(name);
}

export function buildTestEthereumCdpService() {
  return buildTestService('cdp', { cdp: true });
}

export function buildTestEthereumTokenService() {
  return buildTestService('token', { token: true });
}

export function buildTestSmartContractService() {
  return buildTestService('smartContract', { smartContract: true });
}

export function buildTestEventService() {
  return buildTestService('event', { event: true });
}
