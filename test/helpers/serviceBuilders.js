import DefaultServiceProvider from '../../src/config/DefaultServiceProvider';
import ProviderType from '../../src/eth/web3/ProviderType';
import { has, merge } from 'lodash';
import testAccounts from './testAccounts.json';

export const httpProviderConfig = () => ({
  web3: {
    provider: {
      type: ProviderType.HTTP,
      url: 'http://localhost:2000'
    },
    transactionSettings: {
      gasLimit: 4000000
    }
  },
  log: false
});

export const websocketProviderConfig = () => ({
  // FIXME this hard-coded account data is here to work around some test
  // failures, but it shouldn't be necessary
  accounts: {
    default: {
      key: '0x' + testAccounts.keys[0],
      type: 'privateKey'
    }
  },
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
});

const cache = { storage: {} };

export function resetCache() {
  cache.storage = {};
}

const useHttpForTests = false;

export function buildTestContainer(settings = {}) {
  // switch between using websockets for tests is simplified
  const provider =
    useHttpForTests || settings.useHttp
      ? httpProviderConfig()
      : websocketProviderConfig();
  if (settings && settings.accounts) {
    delete provider.accounts;
  }
  if (has(settings, 'useHttp')) {
    delete settings.useHttp;
  }
  merge(provider, settings);
  return new DefaultServiceProvider({
    ...provider
  });
}

export function buildTestService(name, settings) {
  return buildTestContainer(settings).service(name);
}

export function buildTestEthereumCdpService(settings = {}) {
  return buildTestService('cdp', { ...settings, cdp: true });
}

export function buildTestTransactionManagerService(settings = {}) {
  return buildTestContainer({
    ...settings,
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
  return buildTestService('token', { ...settings, token: true });
}

export function buildTestSmartContractService() {
  return buildTestService('smartContract', { smartContract: true });
}

export function buildTestEventService() {
  return buildTestService('event', { event: true });
}
