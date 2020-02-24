import { PROXY_ADDRESS } from './_constants';
import { validateAddress } from './_validators';

export const proxyRegistryProxies = {
  generate: address => ({
    id: `PROXY_REGISTRY.proxies(${address})`,
    contract: 'PROXY_REGISTRY',
    call: ['proxies(address)(address)', address],
    transforms: {
      [PROXY_ADDRESS]: v =>
        v === '0x0000000000000000000000000000000000000000' ? null : v
    }
  }),
  validate: {
    args: validateAddress`Invalid address for proxyAddress: ${'address'}`
  },
  returns: [[PROXY_ADDRESS]]
};

export default {
  proxyRegistryProxies
};
