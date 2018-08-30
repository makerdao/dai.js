import DefaultServiceProvider from '../../src/config/DefaultServiceProvider';
import ProviderType from '../../src/eth/web3/ProviderType';

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

export const defaultProviderConfig = {
  web3: {
    provider: { type: ProviderType.TEST },
    transactionSettings: {
      gasLimit: 4000000
    }
  },
  log: false
};

const cache = { storage: {} };

export function resetCache() {
  cache.storage = {};
}

export function buildTestContainer(settings) {
  return new DefaultServiceProvider({
    ...defaultProviderConfig,
    // ...kovanProviderConfig,
    // cache,
    ...settings
  });
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
