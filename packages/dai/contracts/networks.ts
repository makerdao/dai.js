import tokens from './tokens';
import contracts from './contracts';
import abis from './abis';
import kovanAddresses from './addresses/kovan.json';
import goerliAddresses from './addresses/goerli.json';
import mainnetAddresses from './addresses/mainnet.json';
import testnetAddresses from './addresses/testnet.json';

const addressMapping = {
  mainnet: mainnetAddresses,
  kovan: kovanAddresses,
  goerli: goerliAddresses,
  goerlifork: goerliAddresses,
  testnet: testnetAddresses
};

export function contractAddressesInfo(addresses) {
  return {
    // Tokens
    [tokens.SAI]: [
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
        address: addresses.SAI_GEM,
        abi: abis.dappHub.dsEthToken,
        decimals: 18
      }
    ],
    [tokens.PETH]: [
      {
        version: 1,
        address: addresses.SAI_SKR,
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
        address: addresses.SAI_GOV,
        abi: abis.general.erc20,
        decimals: 18
      }
    ],

    // SAI
    [contracts.SAI_PIP]: [
      { version: 1, address: addresses.SAI_PIP, abi: abis.dappHub.dsValue }
    ],
    [contracts.SAI_TUB]: [
      { version: 1, address: addresses.SAI_TUB, abi: abis.daiV1.tub }
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

    // CageFree
    [contracts.SAI_CAGEFREE]: [
      {
        version: 1,
        address: addresses.SAI_CAGEFREE,
        abi: abis.cageFree
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
  { name: 'rinkeby', networkId: 4 },
  { name: 'goerli', networkId: 5, contracts: contractInfo('goerli') },
  { name: 'kovan', networkId: 42, contracts: contractInfo('kovan') },
  { name: 'test', networkId: 1337, contracts: contractInfo('testnet') },
  {
    name: 'goerlifork',
    networkId: 31337,
    contracts: contractInfo('goerlifork')
  },
  { name: 'test', networkId: TESTNET_ID, contracts: contractInfo('testnet') }
];
