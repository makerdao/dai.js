import tokens from '../tokens';
import contracts from '../contracts';

import dsEthToken_1 from '../abi/ds-eth-token/v1.json';
import erc20Token_1 from '../abi/erc20-token/v1.json';
import makerOtc_1 from '../abi/maker-otc/v1.json';
import dsValue_1 from '../abi/dai/v1/DSValue.json';

import zeroExExchange_1 from '../abi/zeroExExchange/v1.json';

import top_1 from '../abi/dai/v1/SaiTop.json';
import tub_1 from '../abi/dai/v1/SaiTub.json';
import tap_1 from '../abi/dai/v1/SaiTap.json';
import vox_1 from '../abi/dai/v1/SaiVox.json';
import mom_1 from '../abi/dai/v1/SaiMom.json';
import pit_1 from '../abi/dai/v1/GemPit.json';

const mapping = {
  [tokens.DAI]: [
    { version: 1, address: '0xC4375B7De8af5a38a93548eb8453a498222C4fF2', abi: erc20Token_1.interface, decimals: 18 }
  ],
  [tokens.MKR]: [
    { version: 1, address: '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD', abi: erc20Token_1.interface, decimals: 18 }
  ],
  [tokens.WETH]: [
    { version: 1, address: '0xd0A1E359811322d97991E03f863a0C30C2cF029C', abi: dsEthToken_1.interface, decimals: 18 }
  ],
  [tokens.PETH]: [
    { version: 1, address: '0xf4d791139cE033Ad35DB2B2201435fAd668B1b64', abi: erc20Token_1.interface, decimals: 18 }
  ],
  [contracts.SAI_TOP]: [
    { version: 1, address: '0x5f00393547561da3030ebf30e52f5dc0d5d3362c', abi: top_1 }
  ],
  [contracts.SAI_PIP]: [
    { version: 1, address: '0xa944bd4b25c9f186a846fd5668941aa3d3b8425f', abi: dsValue_1 }
  ],
  [contracts.SAI_PEP]: [
    { version: 1, address: '0x02998f73fabb52282664094b0ff87741a1ce9030' }
  ],
  [contracts.SAI_PIT]: [
    { version: 1, address: '0xbd747742b0f1f9791d3e6b85f8797a0cf4fbf10b', abi: pit_1 }
  ],
  [contracts.SAI_SIN]: [
    { version: 1, address: '0xdcdca4371befceafa069ca1e2afd8b925b69e57b' }
  ],
  [contracts.SAI_DAD]: [
    { version: 1, address: '0x6a884c7af48e29a20be9ff04bdde112b5596fcee' }
  ],
  [contracts.SAI_MOM]: [
    { version: 1, address: '0x72ee9496b0867dfe5e8b280254da55e51e34d27b', abi: mom_1 }
  ],
  [contracts.SAI_VOX]: [
    { version: 1, address: '0xbb4339c0ab5b1d9f14bd6e3426444a1e9d86a1d9', abi: vox_1 }
  ],
  [contracts.SAI_TAP]: [
    { version: 1, address: '0xc936749d2d0139174ee0271bd28325074fdbc654', abi: tap_1 }
  ],
  [contracts.SAI_TUB]: [
    { version: 1, address: '0xa71937147b55Deb8a530C7229C442Fd3F31b7db2', abi: tub_1 }
  ],
  [contracts.MAKER_OTC]: [
    { version: 1, address: '0x8cf1Cab422A0b6b554077A361f8419cDf122a9F9', abi: makerOtc_1.interface }
  ],
  [contracts.ZERO_EX_EXCHANGE]: [
    { version: 1, address: '0x90Fe2Af704B34E0224bF2299C838E04d4Dcf1364', abi: zeroExExchange_1.interface }
  ]
};
export default mapping;