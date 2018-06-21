import tokens from '../tokens';
import contracts from '../contracts';
import * as abiMap from '../abi';
import { mainnet as mainnetAddresses } from '../addresses';

const mapping = {
  // Tokens
  [tokens.DAI]: [
    {
      version: 1,
      address: mainnetAddresses.SAI,
      abi: abiMap.general.erc20,
      decimals: 18
    }
  ],
  [tokens.WETH]: [
    {
      version: 1,
      address: mainnetAddresses.GEM,
      abi: abiMap.dappHub.dsEthToken,
      decimals: 18
    }
  ],
  [tokens.PETH]: [
    {
      version: 1,
      address: mainnetAddresses.SKR,
      abi: abiMap.general.erc20,
      decimals: 18
    }
  ],
  [tokens.MKR]: [
    {
      version: 1,
      address: '0xC66eA802717bFb9833400264Dd12c2bCeAa34a6d',
      abi: abiMap.general.erc20,
      decimals: 18
    },
    {
      version: 2,
      address: mainnetAddresses.GOV_NEW,
      abi: abiMap.general.erc20,
      decimals: 18
    }
  ],

  // SAI
  [contracts.SAI_TOP]: [
    { version: 1, address: mainnetAddresses.TOP, abi: abiMap.daiV1.saiTop }
  ],
  [contracts.SAI_PIP]: [
    { version: 1, address: mainnetAddresses.PIP, abi: abiMap.dappHub.dsValue }
  ],
  [contracts.SAI_PEP]: [
    { version: 1, address: mainnetAddresses.PEP, abi: abiMap.dappHub.dsValue }
  ],
  [contracts.SAI_PIT]: [
    { version: 1, address: mainnetAddresses.PIT, abi: abiMap.daiV1.pit }
  ],
  [contracts.SAI_SIN]: [
    { version: 1, address: mainnetAddresses.SIN, abi: abiMap.general.erc20 }
  ],
  [contracts.SAI_DAD]: [
    { version: 1, address: mainnetAddresses.DAD, abi: abiMap.dappHub.dsGuard }
  ],
  [contracts.SAI_MOM]: [
    { version: 1, address: mainnetAddresses.MOM, abi: abiMap.daiV1.mom }
  ],
  [contracts.SAI_VOX]: [
    { version: 1, address: mainnetAddresses.VOX, abi: abiMap.daiV1.vox }
  ],
  [contracts.SAI_TAP]: [
    { version: 1, address: mainnetAddresses.TAP, abi: abiMap.daiV1.tap }
  ],
  [contracts.SAI_TUB]: [
    { version: 1, address: mainnetAddresses.TUB, abi: abiMap.daiV1.tub }
  ],

  // Exchanges
  [contracts.MAKER_OTC]: [
    {
      version: 1,
      address: mainnetAddresses.MAKER_OTC,
      abi: abiMap.exchangesV1.makerOtc
    }
  ],
  [contracts.ZERO_EX_EXCHANGE]: [
    {
      version: 1,
      address: mainnetAddresses.ZERO_EX_EXCHANGE,
      abi: abiMap.exchangesV1.zeroExExchange
    }
  ]
};

export default mapping;
