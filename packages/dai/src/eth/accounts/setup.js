import ProviderType from '../web3/ProviderType';
import Web3ProviderEngine from 'web3-provider-engine/dist/es5';
import WebsocketSubprovider from 'web3-provider-engine/dist/es5/subproviders/websocket';
import RpcSource from 'web3-provider-engine/dist/es5/subproviders/rpc';
import SubscriptionSubprovider from 'web3-provider-engine/dist/es5/subproviders/subscriptions';
import ProviderSubprovider from 'web3-provider-engine/dist/es5/subproviders/provider';

const DEFAULT_POLLING_INTERVAL = 4000;

export async function setupEngine(settings) {
  const { provider: providerSettings, pollingInterval } = settings.web3;

  const engine = new Web3ProviderEngine({
    pollingInterval: pollingInterval || DEFAULT_POLLING_INTERVAL
  });
  const result = { engine };

  const getHttpProvider = (settings = {}) => {
    const rpcUrl = getRpcUrl({ ...providerSettings, ...settings });
    return new RpcSource({ rpcUrl });
  };

  const getWebsocketProvider = () => {
    const rpcUrl = getRpcUrl(providerSettings);
    const subscriptionProvider = new SubscriptionSubprovider();
    subscriptionProvider.on('data', (err, notification) => {
      engine.emit('data', err, notification);
    });
    engine.addProvider(subscriptionProvider);
    return new WebsocketSubprovider({ rpcUrl });
  };

  const getInjectedProvider = () => {
    if (!providerSettings.inject) {
      throw new Error("'inject' must be supplied with ProviderType.INJECT");
    }
    return new ProviderSubprovider(providerSettings.inject);
  };

  switch (providerSettings.type) {
    case ProviderType.BROWSER:
      result.provider = await getBrowserProvider();
      break;
    case ProviderType.WEBSOCKET:
      result.provider = getWebsocketProvider();
      break;
    case ProviderType.HTTP:
      result.provider = getHttpProvider();
      break;
    case ProviderType.INFURA:
      result.provider =
        providerSettings.protocol === 'wss'
          ? getWebsocketProvider()
          : getHttpProvider();
      break;
    case ProviderType.INJECT:
      result.provider = getInjectedProvider();
      break;
    default:
      throw new Error('provider type must be defined');
  }
  engine.addProvider(result.provider);
  return result;
}

export async function getBrowserProvider() {
  if (typeof window === 'undefined') {
    throw new Error(
      'Cannot use ProviderType.BROWSER because window is undefined'
    );
  }

  const wrap = provider => {
    const subprovider = new ProviderSubprovider(provider);
    subprovider.isWindowProvider = true;
    return subprovider;
  };

  if (window.ethereum) {
    await window.ethereum.enable();
    return wrap(window.ethereum);
  } else if (window.web3) {
    return wrap(window.web3.currentProvider);
  }
}

function getInfuraUrl(protocol = 'https', network, infuraProjectId) {
  if (!infuraProjectId) {
    throw new Error('Cannot use infura without a project ID');
  }
  let url = `${protocol}://${network}.infura.io`;
  url += protocol === 'wss' ? '/ws' : '';
  url += `/v3/${infuraProjectId}`;
  return url;
}

function getRpcUrl(providerSettings) {
  const { network, protocol, infuraProjectId, type, url } = providerSettings;
  switch (type) {
    case ProviderType.HTTP:
      return url;
    case ProviderType.WEBSOCKET:
      return url;
    case ProviderType.INFURA:
      return getInfuraUrl(protocol, network, infuraProjectId);
    default:
      throw new Error('Invalid web3 provider type: ' + type);
  }
}
