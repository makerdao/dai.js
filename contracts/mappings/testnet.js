import tokens from '../tokens';
import contracts from '../contracts';
import * as abiMap from '../abi';
import { testnet as testnetAddresses } from '../addresses';

const mapping = {
  // Tokens
  [tokens.DAI]: [
    {
      version: 1,
      address: testnetAddresses.SAI,
      abi: abiMap.general.erc20,
      decimals: 18
    }
  ],
  [tokens.WETH]: [
    {
      version: 1,
      address: testnetAddresses.GEM,
      abi: abiMap.dappHub.dsEthToken,
      decimals: 18
    }
  ],
  [tokens.PETH]: [
    {
      version: 1,
      address: testnetAddresses.SKR,
      abi: abiMap.general.erc20,
      decimals: 18
    }
  ],
  [tokens.MKR]: [
    {
      version: 1,
      address: '0x0000000000000000000000000000000000000001',
      abi: abiMap.general.erc20,
      decimals: 18
    },
    {
      version: 2,
      address: testnetAddresses.GOV,
      abi: abiMap.general.erc20,
      decimals: 18
    }
  ],

  // SAI
  [contracts.SAI_TOP]: [
    { version: 1, address: testnetAddresses.TOP, abi: abiMap.daiV1.saiTop }
  ],
  [contracts.SAI_PIP]: [
    { version: 1, address: testnetAddresses.PIP, abi: abiMap.dappHub.dsValue }
  ],
  [contracts.SAI_PEP]: [
    { version: 1, address: testnetAddresses.PEP, abi: abiMap.dappHub.dsValue }
  ],
  [contracts.SAI_PIT]: [
    { version: 1, address: testnetAddresses.PIT, abi: abiMap.daiV1.pit }
  ],
  [contracts.SAI_SIN]: [
    { version: 1, address: testnetAddresses.SIN, abi: abiMap.general.erc20 }
  ],
  [contracts.SAI_DAD]: [
    { version: 1, address: testnetAddresses.DAD, abi: abiMap.dappHub.dsGuard }
  ],
  [contracts.SAI_MOM]: [
    { version: 1, address: testnetAddresses.MOM, abi: abiMap.daiV1.mom }
  ],
  [contracts.SAI_VOX]: [
    { version: 1, address: testnetAddresses.VOX, abi: abiMap.daiV1.vox }
  ],
  [contracts.SAI_TAP]: [
    { version: 1, address: testnetAddresses.TAP, abi: abiMap.daiV1.tap }
  ],
  [contracts.SAI_TUB]: [
    { version: 1, address: testnetAddresses.TUB, abi: abiMap.daiV1.tub }
  ],

  // Exchanges
  [contracts.MAKER_OTC]: [
    {
      version: 1,
      address: testnetAddresses.MAKER_OTC,
      abi: abiMap.exchangesV1.makerOtc
    }
  ]
};

export default mapping;
