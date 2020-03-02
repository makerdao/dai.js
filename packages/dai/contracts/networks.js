import tokens from './tokens';
import contracts from './contracts';
import * as abis from './abis';
import kovanAddresses from './addresses/kovan.json';
import mainnetAddresses from './addresses/mainnet.json';
import testnetAddresses from './addresses/testnet.json';

const addressMapping = {
  mainnet: mainnetAddresses,
  kovan: kovanAddresses,
  testnet: testnetAddresses
};

export function contractAddressesInfo(addresses) {
  return {
    // Tokens
    [tokens.DAI]: [
      {
        version: 1,
        address: addresses.SAI,
        abi: abis.general.erc20,
        decimals: 18
      }
    ],
    [tokens.WETH]: [
      {
        version: 1,
        address: addresses.GEM,
        abi: abis.dappHub.dsEthToken,
        decimals: 18
      }
    ],
    [tokens.PETH]: [
      {
        version: 1,
        address: addresses.SKR,
        abi: abis.general.erc20,
        decimals: 18
      }
    ],
    [tokens.MKR]: [
      {
        version: 1,
        address:
          addresses.GOV_OLD || '0x0000000000000000000000000000000000000001',
        abi: abis.general.erc20,
        decimals: 18
      },
      {
        version: 2,
        address: addresses.GOV,
        abi: abis.general.erc20,
        decimals: 18
      }
    ],

    // SAI
    [contracts.SAI_TOP]: [
      { version: 1, address: addresses.TOP, abi: abis.daiV1.saiTop }
    ],
    [contracts.SAI_PIP]: [
      { version: 1, address: addresses.PIP, abi: abis.dappHub.dsValue }
    ],
    [contracts.SAI_PEP]: [
      { version: 1, address: addresses.PEP, abi: abis.dappHub.dsValue }
    ],
    [contracts.SAI_PIT]: [
      { version: 1, address: addresses.PIT, abi: abis.daiV1.pit }
    ],
    [contracts.SAI_SIN]: [
      { version: 1, address: addresses.SIN, abi: abis.general.erc20 }
    ],
    [contracts.SAI_DAD]: [
      { version: 1, address: addresses.DAD, abi: abis.dappHub.dsGuard }
    ],
    [contracts.SAI_MOM]: [
      { version: 1, address: addresses.MOM, abi: abis.daiV1.mom }
    ],
    [contracts.SAI_VOX]: [
      { version: 1, address: addresses.VOX, abi: abis.daiV1.vox }
    ],
    [contracts.SAI_TAP]: [
      { version: 1, address: addresses.TAP, abi: abis.daiV1.tap }
    ],
    [contracts.SAI_TUB]: [
      { version: 1, address: addresses.TUB, abi: abis.daiV1.tub }
    ],

    // Exchanges
    [contracts.MAKER_OTC]: [
      {
        version: 1,
        address: addresses.MAKER_OTC,
        abi: abis.exchangesV1.makerOtc
      }
    ],

    // Multicall
    [contracts.MULTICALL]: [
      {
        version: 1,
        address: addresses.MULTICALL,
        abi: abis.multicall
      }
    ],

    // Proxies
    [contracts.SAI_PROXY]: [
      {
        version: 1,
        address: addresses.SAI_PROXY,
        abi: abis.proxies.saiProxy
      }
    ],
    [contracts.OASIS_PROXY]: [
      {
        version: 1,
        address: addresses.OASIS_PROXY,
        abi: abis.proxies.oasisProxy
      }
    ],
    [contracts.DS_PROXY_FACTORY]: [
      {
        version: 1,
        address: addresses.DS_PROXY_FACTORY,
        abi: abis.proxies.dsProxyFactory
      }
    ],
    [contracts.DS_PROXY]: [
      {
        version: 1,
        abi: abis.dappHub.dsProxy
      }
    ],
    [contracts.PROXY_REGISTRY]: [
      {
        version: 1,
        address: addresses.PROXY_REGISTRY,
        abi: abis.proxies.proxyRegistry
      }
    ]
  };
}

export function contractInfo(network) {
  const addresses = addressMapping[network];
  return contractAddressesInfo(addresses);
}

export const TESTNET_ID = 999;

export default [
  { name: 'mainnet', networkId: 1, contracts: contractInfo('mainnet') },
  { name: 'morden', networkId: 2 },
  { name: 'ropsten', networkId: 3 },
  {
    name: 'rinkeby',
    networkId: 4
  },
  {
    name: 'goerli',
    networkId: 5
  },

  { name: 'kovan', networkId: 42, contracts: contractInfo('kovan') },
  { name: 'test', networkId: 1337, contracts: contractInfo('testnet') },
  { name: 'test', networkId: TESTNET_ID, contracts: contractInfo('testnet') }
];
