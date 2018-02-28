import dsEthToken_1 from '../abi/ds-eth-token/v1';
import erc20Token_1 from '../abi/erc20-token/v1';
import top_1 from '../abi/dai/v1/top';
import tub_1 from '../abi/dai/v1/tub';
import tokens from '../tokens';
import contracts from '../contracts';

const mapping = {

  [tokens.DAI] : [
    { version: 1, Address: '0x....', abi: erc20Token_1.interface },
  ],
  [tokens.MKR] : [
    { version: 1, Address: '0x....', abi: erc20Token_1.interface },
    { version: 2, Address: '0x....', abi: erc20Token_1.interface },
  ],
  [contracts.TOP] : [
    { version: 1, Address: '0x....', abi: top_1.interface },
  ],
  [contracts.TUB] : [
    { version: 1, Address: '0xa71937147b55Deb8a530C7229C442Fd3F31b7db2', abi: tub_1.interface },
  ]

};
export default mapping;