import ProviderType from './ProviderType';
import Web3ProviderEngine from 'web3-provider-engine/dist/es5';
import RpcSource from 'web3-provider-engine/dist/es5/subproviders/rpc';
import Web3 from 'web3';
import ProviderSubprovider from 'web3-provider-engine/dist/es5/subproviders/provider';

export default async function setupWeb3(settings, accountsService) {
  const web3 = new Web3();
  const engine = new Web3ProviderEngine();
  web3.setProvider(engine);

  if (settings.provider.type === ProviderType.WINDOW) {
    const windowProvider = await getWindowProvider();
    engine.addProvider(new ProviderSubprovider(windowProvider));
  } else {
    const rpcUrl = getRpcUrl(settings.provider);
    engine.addProvider(new RpcSource({ rpcUrl }));
  }

  // this must come after subprovider setup, because it starts the engine
  accountsService.attachToEngine(engine);

  return web3;
}

async function getWindowProvider() {
  if (typeof window === 'undefined') {
    throw new Error(
      'Cannot use ProviderType.WINDOW because window is undefined'
    );
  }

  // If web3 is injected (legacy browsers)...
  if (typeof window.web3 !== 'undefined') {
    return window.web3.currentProvider;
  }

  // If web3 is not injected (modern browsers)...
  return new Promise((resolve, reject) => {
    let resolved = false;

    window.addEventListener('message', ({ data }) => {
      if (data && data.type && data.type === 'ETHEREUM_PROVIDER_SUCCESS') {
        resolved = true;
        resolve(window.ethereum);
      }
    });

    // Request provider
    window.postMessage({ type: 'ETHEREUM_PROVIDER_REQUEST' }, '*');

    setTimeout(() => {
      if (!resolved) reject(new Error('Timed out waiting for provider'));
    }, 30000);
  });
}

function getRpcUrl(providerSettings) {
  const { network, infuraApiKey, type, url } = providerSettings;
  switch (type) {
    case ProviderType.HTTP:
      return url;
    case ProviderType.INFURA:
      return `https://${network}.infura.io/${infuraApiKey || ''}`;
    case ProviderType.TEST:
      return 'http://127.1:2000';
    default:
      throw new Error('Invalid web3 provider type: ' + type);
  }
}
