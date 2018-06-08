import DefaultServiceProvider from '../../src/utils/DefaultServiceProvider';
import Web3ProviderType from '../../src/eth/Web3ProviderType';

const defaultProviderConfig = {
  web3: {
    provider: { type: Web3ProviderType.TEST }
  },
  log: false
};

export function buildTestService(name, settings) {
  return new DefaultServiceProvider({
    ...defaultProviderConfig,
    ...settings
  }).service(name);
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
