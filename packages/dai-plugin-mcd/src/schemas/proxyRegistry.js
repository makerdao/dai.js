import { PROXY_ADDRESS, PROXY_OWNER } from './constants';

export const proxyRegistryProxies = {
  generate: (address, nullIfNoProxy = false) => ({
    id: `PROXY_REGISTRY.proxies(${address})`,
    contract: 'PROXY_REGISTRY',
    call: ['proxies(address)(address)', address],
    transforms: {
      [PROXY_ADDRESS]: proxyAddress => {
        if (nullIfNoProxy) {
          return proxyAddress === '0x0000000000000000000000000000000000000000'
            ? null
            : proxyAddress;
        }
        return proxyAddress;
      }
    }
  }),
  returns: [[PROXY_ADDRESS]]
};

// TODO: throw an error if the DSProxy contract doesn't exist
//       could use new multicall onError event listener
export const proxyGetOwner = {
  generate: address => ({
    id: `DS_PROXY.owner(${address})`,
    target: address,
    call: ['owner()(address)']
  }),
  returns: [[PROXY_OWNER]]
};

export default {
  proxyRegistryProxies,
  proxyGetOwner
};
