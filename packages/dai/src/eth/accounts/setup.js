import ProviderType from '../web3/ProviderType';
import Web3ProviderEngine from 'web3-provider-engine/dist/es5';
import WebsocketSubprovider from 'web3-provider-engine/dist/es5/subproviders/websocket';
import RpcSource from 'web3-provider-engine/dist/es5/subproviders/rpc';
import SubscriptionSubprovider from 'web3-provider-engine/dist/es5/subproviders/subscriptions';
import ProviderSubprovider from 'web3-provider-engine/dist/es5/subproviders/provider';
import MulticallProvider from '../../MulticallProvider';

// const EthBlockTracker = require('eth-block-tracker/src/subscribe.js')
//   // block polling
//   const directProvider = { sendAsync: self._handleAsync.bind(self) }
//   const blockTrackerProvider = opts.blockTrackerProvider || directProvider
//   self._blockTracker = opts.blockTracker || new EthBlockTracker({
//     provider: blockTrackerProvider,
//     pollingInterval: opts.pollingInterval || 4000,
//     setSkipCacheFlag: true,
//   })

const DEFAULT_POLLING_INTERVAL = 4000;

export async function setupEngine(settings) {
  const { provider: providerSettings, pollingInterval } = settings.web3;

  const engine = new Web3ProviderEngine({
    pollingInterval: pollingInterval || DEFAULT_POLLING_INTERVAL,
    // blockTracker:
  });
  engine.addProvider(new MulticallProvider({ multicallAddress: '0xA70B7c2a55a76f89b64b4b15381FfF87279dD3d7' }), 0);

  const result = { engine };

  const getHttpProvider = () => {
    const rpcUrl = getRpcUrl(providerSettings);
    const subscriptionProvider = new SubscriptionSubprovider();
    engine.addProvider(subscriptionProvider);
    return new RpcSource({ rpcUrl });
  };

  const getWebsocketProvider = () => {
    const rpcUrl = getRpcUrl(providerSettings);
    const subscriptionProvider = new SubscriptionSubprovider();
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
