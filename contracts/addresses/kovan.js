import tokens from '../tokens';
import contracts from '../contracts';

import dsEthToken_1 from '../abi/ds-eth-token/v1.json';
import erc20Token_1 from '../abi/erc20-token/v1.json';
import makerOtc_1 from '../abi/maker-otc/v1.json';

import zeroExExchange_1 from '../abi/zeroExExchange/v1.json';

import top_1 from '../abi/dai/v1/SaiTop.json';
import tub_1 from '../abi/dai/v1/SaiTub.json';

const mapping = {
  [tokens.DAI] : [
    { version: 1, address: '0xC4375B7De8af5a38a93548eb8453a498222C4fF2', abi: erc20Token_1.interface, decimals: 18 }
  ],
  [tokens.MKR] : [
    { version: 1, address: '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD', abi: erc20Token_1.interface, decimals: 18 }
  ],
  [tokens.WETH] : [
    { version: 1, address: '0xd0A1E359811322d97991E03f863a0C30C2cF029C', abi: dsEthToken_1.interface, decimals: 18 }
  ],
  [tokens.PETH] : [
    { version: 1, address: '0xf4d791139cE033Ad35DB2B2201435fAd668B1b64', abi: erc20Token_1.interface, decimals: 18 }
  ],
  [contracts.SAI_TOP] : [
    { version: 1, address: '0x....', abi: top_1 }
  ],
  [contracts.SAI_TUB] : [
    { version: 1, address: '0xa71937147b55Deb8a530C7229C442Fd3F31b7db2', abi: tub_1 }
  ],
  [contracts.MAKER_OTC] : [
    { version: 1, address: '0x8cf1Cab422A0b6b554077A361f8419cDf122a9F9', abi: makerOtc_1.interface }
  ],
  [contracts.ZERO_EX_EXCHANGE] : [
    {version: 1, address: '0x90Fe2Af704B34E0224bF2299C838E04d4Dcf1364', abi: zeroExExchange_1.interface }
  ]
};
export default mapping;