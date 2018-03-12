import makerOtc_1 from '../abi/maker-otc/v1';
//import dsEthToken_1 from '../abi/ds-eth-token/v1';
import erc20Token_1 from '../abi/erc20-token/v1';
import top_1 from '../abi/dai/v1/top';
import tub_1 from '../abi/dai/v1/tub';
import tokens from '../tokens';
import contracts from '../contracts';

const mapping = {

  [tokens.DAI] : [
    { version: 1, address: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359', abi: erc20Token_1.interface },
  ],
  [tokens.MKR] : [
    { version: 1, address: '0x....', abi: erc20Token_1.interface },
    { version: 2, address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', abi: erc20Token_1.interface },
  ],
  [contracts.TOP] : [
    { version: 1, address: '0x....', abi: top_1.interface },
  ],
  [contracts.TUB] : [
    { version: 1, address: '0x448a5065aeBB8E423F0896E6c5D525C040f59af3', abi: tub_1.interface },
  ],
  [contracts.MAKER_OTC] : [
    { version: 1, address: '0x14FBCA95be7e99C15Cc2996c6C9d841e54B79425', abi: makerOtc_1.interface }
  ]
};
export default mapping;