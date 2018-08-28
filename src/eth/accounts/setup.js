import ProviderType from '../web3/ProviderType';
import Web3ProviderEngine from 'web3-provider-engine/dist/es5';
import RpcSource from 'web3-provider-engine/dist/es5/subproviders/rpc';
import ProviderSubprovider from 'web3-provider-engine/dist/es5/subproviders/provider';

export async function setupEngine(settings) {
  const { provider: providerSettings } = settings.web3;
  const engine = new Web3ProviderEngine();
  const result = { engine };

  if (providerSettings.type === ProviderType.BROWSER || !providerSettings) {
    result.provider = await getBrowserProvider();
  } else {
    const rpcUrl = getRpcUrl(providerSettings);
    result.provider = new RpcSource({ rpcUrl });
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

  // If web3 is injected (old MetaMask)...
  if (typeof window.web3 !== 'undefined') {
    return wrap(window.web3.currentProvider);
  }

  // If web3 is not injected (new MetaMask)...
  return new Promise((resolve, reject) => {
    let resolved = false;

    window.addEventListener('message', ({ data }) => {
      if (data && data.type && data.type === 'ETHEREUM_PROVIDER_SUCCESS') {
        resolved = true;
        resolve(wrap(window.ethereum));
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
