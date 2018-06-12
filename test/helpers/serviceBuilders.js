import DefaultServiceProvider from '../../src/utils/DefaultServiceProvider';
import Web3ProviderType from '../../src/eth/Web3ProviderType';

export const kovanProviderConfig = {
  web3: {
    privateKey:
      '0xa69d30145491b4c1d55e52453cabb2e73a9daff6326078d49376449614d2f700',
    provider: {
      type: Web3ProviderType.INFURA,
      network: 'kovan',
      infuraApiKey: 'ihagQOzC3mkRXYuCivDN'
    }
  },
  log: false
};

export const defaultProviderConfig = {
  web3: {
    provider: { type: Web3ProviderType.TEST }
  },
  log: false
};

export function buildTestContainer(settings) {
  return new DefaultServiceProvider({
    ...kovanProviderConfig,
    // ...defaultProviderConfig,
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
