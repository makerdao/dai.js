import DefaultServiceProvider from '../../src/config/DefaultServiceProvider';
import ProviderType from '../../src/eth/web3/ProviderType';
import { merge } from 'lodash';
import testAccounts from './testAccounts.json';

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

export const defaultProviderConfig = () => ({
  web3: {
    provider: { type: ProviderType.TEST },
    transactionSettings: {
      gasLimit: 4000000
    }
  },
  log: false
});

export const websocketProviderConfig = () => ({
  accounts: {
    default: {
      key: '0x' + testAccounts.keys[0],
      type: 'privateKey'
    }
  },
  web3: {
    provider: {
      type: ProviderType.WS,
      url: 'ws://localhost:2000'
    },
    transactionSettings: {
      gasLimit: 4000000
    }
  },
  log: false
});

const cache = { storage: {} };

export function resetCache() {
  cache.storage = {};
}

const useWebsocketsForTests = false;

export function buildTestContainer(settings) {
  // switch between using websockets for tests is simplified
  const provider = useWebsocketsForTests
    ? websocketProviderConfig()
    : defaultProviderConfig();
  if (settings && settings.accounts) {
    delete provider.accounts;
  }
  merge(provider, settings);
  return new DefaultServiceProvider({
    ...provider
    // ...kovanProviderConfig,
    // cache
  });
}

export function buildTestService(name, settings) {
  return buildTestContainer(settings).service(name);
}

export function buildTestEthereumCdpService(settings = {}) {
  settings['cdp'] = true;
  return buildTestService('cdp', settings);
}

export function buildTestTransactionManagerService() {
  return buildTestContainer({
    smartContract: true,
    transactionManager: true,
    web3: {
      transactionSettings: {
        gasLimit: 1234567
      }
    }
  });
}

export function buildTestEthereumTokenService(settings = {}) {
  settings['token'] = true;
  return buildTestService('token', settings);
}

export function buildTestSmartContractService() {
  return buildTestService('smartContract', { smartContract: true });
}

export function buildTestEventService() {
  return buildTestService('event', { event: true });
}
