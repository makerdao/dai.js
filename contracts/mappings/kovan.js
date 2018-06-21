import tokens from '../tokens';
import contracts from '../contracts';
import * as abiMap from '../abi';
import { kovan as kovanAddresses } from '../addresses';

const mapping = {
  // Tokens
  [tokens.DAI]: [
    {
      version: 1,
      address: kovanAddresses.SAI,
      abi: abiMap.general.erc20,
      decimals: 18
    }
  ],
  [tokens.WETH]: [
    {
      version: 1,
      address: kovanAddresses.GEM,
      abi: abiMap.dappHub.dsEthToken,
      decimals: 18
    }
  ],
  [tokens.PETH]: [
    {
      version: 1,
      address: kovanAddresses.SKR,
      abi: abiMap.general.erc20,
      decimals: 18
    }
  ],
  [tokens.MKR]: [
    {
      version: 1,
      address: kovanAddresses.GOV,
      abi: abiMap.general.erc20,
      decimals: 18
    }
  ],

  // SAI
  [contracts.SAI_TOP]: [
    { version: 1, address: kovanAddresses.TOP, abi: abiMap.daiV1.saiTop }
  ],
  [contracts.SAI_PIP]: [
    { version: 1, address: kovanAddresses.PIP, abi: abiMap.dappHub.dsValue }
  ],
  [contracts.SAI_PEP]: [
    { version: 1, address: kovanAddresses.PEP, abi: abiMap.dappHub.dsValue }
  ],
  [contracts.SAI_PIT]: [
    { version: 1, address: kovanAddresses.PIT, abi: abiMap.daiV1.pit }
  ],
  [contracts.SAI_SIN]: [
    { version: 1, address: kovanAddresses.SIN, abi: abiMap.general.erc20 }
  ],
  [contracts.SAI_DAD]: [
    { version: 1, address: kovanAddresses.DAD, abi: abiMap.dappHub.dsGuard }
  ],
  [contracts.SAI_MOM]: [
    { version: 1, address: kovanAddresses.MOM, abi: abiMap.daiV1.mom }
  ],
  [contracts.SAI_VOX]: [
    { version: 1, address: kovanAddresses.VOX, abi: abiMap.daiV1.vox }
  ],
  [contracts.SAI_TAP]: [
    { version: 1, address: kovanAddresses.TAP, abi: abiMap.daiV1.tap }
  ],
  [contracts.SAI_TUB]: [
    { version: 1, address: kovanAddresses.TUB, abi: abiMap.daiV1.tub }
  ],

  // Exchanges
  [contracts.MAKER_OTC]: [
    {
      version: 1,
      address: kovanAddresses.MAKER_OTC,
      abi: abiMap.exchangesV1.makerOtc
    }
  ],
  [contracts.ZERO_EX_EXCHANGE]: [
    {
      version: 1,
      address: kovanAddresses.ZERO_EX_EXCHANGE,
      abi: abiMap.exchangesV1.zeroExExchange
    }
  ]
};

export default mapping;
