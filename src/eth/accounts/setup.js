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

  return new Promise(async (resolve, reject) => {
    if (window.ethereum) {
      try {
        await window.ethereum.enable();
        resolve(wrap(window.ethereum));
      } catch (error) {
        reject(error);
      }
    } else if (window.web3) {
      resolve(wrap(window.web3.currentProvider));
    }
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
