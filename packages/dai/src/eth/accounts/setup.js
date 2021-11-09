import ProviderType from '../web3/ProviderType';
import { ethers } from 'ethers';

// const DEFAULT_POLLING_INTERVAL = 4000;

export async function setupEthersProvider(settings) {
  const { provider: providerSettings } = settings.web3;
  const rpcUrl = getRpcUrl(providerSettings);
  const subscriptionProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
  return subscriptionProvider;
}

export async function setupEngine(settings) {
  const { provider: providerSettings } = settings.web3;

  let provider;

  const getHttpProvider = () => {
    const rpcUrl = getRpcUrl(providerSettings);
    const jsonRpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);

    return jsonRpcProvider;
  };

  const getWebsocketProvider = () => {
    const rpcUrl = getRpcUrl(providerSettings);
    const subscriptionProvider = new ethers.providers.WebSocketProvider(rpcUrl);
    return subscriptionProvider;
  };

  const getInjectedProvider = () => {
    if (!providerSettings.inject) {
      throw new Error("'inject' must be supplied with ProviderType.INJECT");
    }
    const externalProvider = new ethers.providers.Web3Provider(
      providerSettings.inject
    );
    return externalProvider;
  };

  switch (providerSettings.type) {
    case ProviderType.BROWSER:
      provider = await getBrowserProvider();
      break;
    case ProviderType.WEBSOCKET:
      provider = getWebsocketProvider();
      break;
    case ProviderType.HTTP:
      provider = getHttpProvider();
      break;
    case ProviderType.INFURA:
      provider =
        providerSettings.protocol === 'wss'
          ? getWebsocketProvider()
          : getHttpProvider();
      break;
    case ProviderType.INJECT:
      provider = getInjectedProvider();
      break;
    default:
      throw new Error('provider type must be defined');
  }

  return provider;
}

export async function getBrowserProvider() {
  if (typeof window === 'undefined') {
    throw new Error(
      'Cannot use ProviderType.BROWSER because window is undefined'
    );
  }

  const wrap = provider => {
    const subprovider = new ethers.providers.Web3Provider(provider);
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
