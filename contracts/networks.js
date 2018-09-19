import tokens from './tokens';
import contracts from './contracts';
import * as abiMap from './abi';

import {
  testnet as testAddresses,
  kovan as kovanAddresses,
  mainnet as mainnetAddresses
} from './addresses';

export function contractInfo(network) {
  let addresses;
  switch (network) {
    case 'mainnet':
      addresses = mainnetAddresses;
      break;
    case 'kovan':
      addresses = kovanAddresses;
      break;
    case 'test':
      addresses = testAddresses;
      break;
  }

  return {
    // Tokens
    [tokens.DAI]: [
      {
        version: 1,
        address: addresses.SAI,
        abi: abiMap.general.erc20,
        decimals: 18
      }
    ],
    [tokens.WETH]: [
      {
        version: 1,
        address: addresses.GEM,
        abi: abiMap.dappHub.dsEthToken,
        decimals: 18
      }
    ],
    [tokens.PETH]: [
      {
        version: 1,
        address: addresses.SKR,
        abi: abiMap.general.erc20,
        decimals: 18
      }
    ],
    [tokens.MKR]: [
      {
        version: 1,
        address:
          addresses.GOV_OLD || '0x0000000000000000000000000000000000000001',
        abi: abiMap.general.erc20,
        decimals: 18
      },
      {
        version: 2,
        address: addresses.GOV,
        abi: abiMap.general.erc20,
        decimals: 18
      }
    ],

    // SAI
    [contracts.SAI_TOP]: [
      { version: 1, address: addresses.TOP, abi: abiMap.daiV1.saiTop }
    ],
    [contracts.SAI_PIP]: [
      { version: 1, address: addresses.PIP, abi: abiMap.dappHub.dsValue }
    ],
    [contracts.SAI_PEP]: [
      { version: 1, address: addresses.PEP, abi: abiMap.dappHub.dsValue }
    ],
    [contracts.SAI_PIT]: [
      { version: 1, address: addresses.PIT, abi: abiMap.daiV1.pit }
    ],
    [contracts.SAI_SIN]: [
      { version: 1, address: addresses.SIN, abi: abiMap.general.erc20 }
    ],
    [contracts.SAI_DAD]: [
      { version: 1, address: addresses.DAD, abi: abiMap.dappHub.dsGuard }
    ],
    [contracts.SAI_MOM]: [
      { version: 1, address: addresses.MOM, abi: abiMap.daiV1.mom }
    ],
    [contracts.SAI_VOX]: [
      { version: 1, address: addresses.VOX, abi: abiMap.daiV1.vox }
    ],
    [contracts.SAI_TAP]: [
      { version: 1, address: addresses.TAP, abi: abiMap.daiV1.tap }
    ],
    [contracts.SAI_TUB]: [
      { version: 1, address: addresses.TUB, abi: abiMap.daiV1.tub }
    ],

    // Exchanges
    [contracts.MAKER_OTC]: [
      {
        version: 1,
        address: addresses.MAKER_OTC,
        abi: abiMap.exchangesV1.makerOtc
      }
    ],

    // Proxies
    [contracts.SAI_PROXY]: [
      {
        version: 1,
        address: addresses.SAI_PROXY,
        abi: abiMap.proxies.saiProxy
      }
    ],
    [contracts.DS_PROXY_FACTORY]: [
      {
        version: 1,
        address: addresses.DS_PROXY_FACTORY,
        abi: abiMap.proxies.dsProxyFactory
      }
    ],
    [contracts.DS_PROXY]: [
      {
        version: 1,
        abi: abiMap.dappHub.dsProxy
      }
    ],
    [contracts.PROXY_REGISTRY]: [
      {
        version: 1,
        address: addresses.PROXY_REGISTRY,
        abi: abiMap.proxies.proxyRegistry
      }
    ]
  };
}

export default [
  { name: 'mainnet', networkId: 1, addresses: contractInfo('mainnet') },
  { name: 'morden', networkId: 2, addresses: null },
  { name: 'ropsten', networkId: 3, addresses: null },
  { name: 'rinkeby', networkId: 4, addresses: null },
  { name: 'kovan', networkId: 42, addresses: contractInfo('kovan') },
  { name: 'test', networkId: 999, addresses: contractInfo('test') }
];
