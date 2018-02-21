import dsEthToken_1 from '../abi/ds-eth-token/v1';
import erc20Token_1 from '../abi/erc20-token/v1';
import tokens from '../tokens';


const mapping = {

  [tokens.DAI] : [
    { version: 1, tokenAddress: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359', abi: erc20Token_1.interface },
  ],
  [tokens.MKR] : [
    { version: 1, tokenAddress: '0x....', abi: erc20Token_1.interface },
    { version: 2, tokenAddress: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', abi: erc20Token_1.interface },
  ]
};
export default mapping;