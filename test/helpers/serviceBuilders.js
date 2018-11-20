import DefaultServiceProvider from '../../src/config/DefaultServiceProvider';
import ProviderType from '../../src/eth/web3/ProviderType';
import { merge } from 'lodash';

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
      key: '0x474beb999fed1b3af2ea048f963833c686a0fba05f5724cb6417cf3b8ee9697e',
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

const useWebsocketsForTests = true;

export function buildTestContainer(settings) {
  // flip between using websockets for tests is simplified
  const provider = useWebsocketsForTests ? websocketProviderConfig() : defaultProviderConfig();
  if(settings && settings.accounts) {
    delete provider.accounts;
  }
  merge(provider, settings);
  return new DefaultServiceProvider({
    ...provider,    
    // ...kovanProviderConfig,
    // cache
  });
}

export function buildTestService(name, settings) {
  return buildTestContainer(settings).service(name);
}

export function buildTestEthereumCdpService() {
  return buildTestService('cdp', { cdp: true });
}

export function buildTestTransactionManagerService() {
  return buildTestContainer({
    smartContract: true,
    transactionManager: true,
    web3: { transactionSettings: { gasLimit: 1234567 }}
  });
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
