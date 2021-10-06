import DefaultServiceProvider from '../../src/config/DefaultServiceProvider';
import ProviderType from '../../src/eth/web3/ProviderType';
import has from 'lodash/has';
import merge from 'lodash/merge';

export const infuraProjectId = 'c3f0f26a4c1742e0949d8eedfc47be67'; //dai.js project id

export const kovanProviderConfig = {
  web3: {
    privateKey: process.env.KOVAN_PRIVATE_KEY,
    provider: {
      type: ProviderType.INFURA,
      network: 'kovan',
      infuraProjectId
    }
  }
};
export const goerliProviderConfig = {
  // TODO update for goerli
  web3: {
    privateKey: process.env.GOERLI_PRIVATE_KEY,
    provider: {
      type: ProviderType.INFURA,
      network: 'goerli',
      infuraProjectId
    }
  }
};
export const websocketProviderConfig = {
  web3: {
    provider: {
      type: ProviderType.WEBSOCKET,
      url: 'ws://localhost:2000'
    },
    pollingInterval: 50
  }
};

export const httpProviderConfig = {
  web3: {
    provider: {
      type: ProviderType.HTTP,
      url: 'http://localhost:2000'
    },
    pollingInterval: 50
  }
};

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

export function buildTestService(name, settings = {}) {
  if (!settings[name]) settings[name] = true;
  return buildTestContainer(settings).service(name);
}

// export function buildTestEthereumCdpService(settings = {}) {
//   return buildTestService('cdp', { cdp: true, ...settings });
// }

export function buildTestEthereumTokenService(settings = {}) {
  return buildTestService('token', { token: true, ...settings });
}

export function buildTestSmartContractService(settings = {}) {
  return buildTestService('smartContract', {
    smartContract: true,
    ...settings
  });
}

export function buildTestEventService(settings = {}) {
  return buildTestService('event', { event: true, ...settings });
}
