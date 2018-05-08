import tokens from '../tokens';
import contracts from '../contracts';

import dsEthToken_1 from '../abi/ds-eth-token/v1.json';
import erc20Token_1 from '../abi/erc20-token/v1.json';
import makerOtc_1 from '../abi/maker-otc/v1.json';
import dsValue_1 from '../abi/dai/v1/DSValue.json';

import gemPit_1 from '../abi/dai/v1/GemPit.json';
import saiMom_1 from '../abi/dai/v1/SaiMom.json';
import saiVox_1 from '../abi/dai/v1/SaiVox.json';
import saiTub_1 from '../abi/dai/v1/SaiTub.json';
import saiTap_1 from '../abi/dai/v1/SaiTap.json';
import saiTop_1 from '../abi/dai/v1/SaiTop.json';

import saiAdresses from '../abi/dai/v1/addresses.json';

const mapping = {
  // Tokens
  [tokens.WETH] : [
    { version: 1, address: saiAdresses.GEM, abi: dsEthToken_1.interface, decimals: 18 },
  ],
  [tokens.PETH] : [
    { version: 1, address: saiAdresses.SKR, abi: erc20Token_1.interface, decimals: 18 },
  ],
  [tokens.DAI] : [
    { version: 1, address: saiAdresses.SAI, abi: erc20Token_1.interface, decimals: 18 },
  ],
  [tokens.MKR] : [
    { version: 1, address: '0x0000000000000000000000000000000000000001', abi: erc20Token_1.interface, decimals: 18 },
    { version: 2, address: saiAdresses.GOV, abi: erc20Token_1.interface, decimals: 18 },
  ],

  // SAI
  [contracts.SAI_PIP] : [
    { version: 1, address: saiAdresses.PIP, abi: dsValue_1 },
  ],
  [contracts.SAI_PEP] : [
    { version: 1, address: saiAdresses.PEP, abi: dsValue_1 },
  ],
  [contracts.SAI_PIT] : [
    { version: 1, address: saiAdresses.PIT, abi: gemPit_1 },
  ],
  [contracts.SAI_SIN] : [
    { version: 1, address: saiAdresses.SIN, abi: erc20Token_1.interface },
  ],
  [contracts.SAI_MOM] : [
    { version: 1, address: saiAdresses.MOM, abi: saiMom_1 },
  ],
  [contracts.SAI_VOX] : [
    { version: 1, address: saiAdresses.VOX, abi: saiVox_1 },
  ],
  [contracts.SAI_TUB] : [
    { version: 1, address: saiAdresses.TUB, abi: saiTub_1 },
  ],
  [contracts.SAI_TAP] : [
    { version: 1, address: saiAdresses.TAP, abi: saiTap_1 },
  ],
  [contracts.SAI_TOP] : [
    { version: 1, address: saiAdresses.TOP, abi: saiTop_1 },
  ],

  // Oasis
  [contracts.MAKER_OTC] : [
    { version: 1, address: '0x0aa4e9ba2d892307784c69e94f3b5d7b7aff4201', abi: makerOtc_1.interface }
  ]
};

export default mapping;