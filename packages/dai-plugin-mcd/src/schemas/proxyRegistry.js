import { PROXY_ADDRESS } from './_constants';
import { validateAddress, validatProxyAddressResult } from './_validators';

export const proxyRegistryProxies = {
  generate: address => ({
    id: `PROXY_REGISTRY.proxies(${address})`,
    contract: 'PROXY_REGISTRY',
    call: ['proxies(address)(address)', address]
  }),
  validate: {
    args: validateAddress`Invalid address: ${'address'}`,
    [PROXY_ADDRESS]: validatProxyAddressResult`No proxy found for account address: ${'address'}`
  },
  returns: [[PROXY_ADDRESS]]
};

export default {
  proxyRegistryProxies
};
