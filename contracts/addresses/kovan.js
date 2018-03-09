import dsEthToken_1 from '../abi/ds-eth-token/v1';
import erc20Token_1 from '../abi/erc20-token/v1';
import top_1 from '../abi/dai/v1/top';
import tub_1 from '../abi/dai/v1/tub';
import tokens from '../tokens';
import contracts from '../contracts';

const mapping = {

  [tokens.DAI] : [
    { version: 1, address: '0x....', abi: erc20Token_1.interface }
  ],
  [tokens.MKR] : [
    { version: 1, address: '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD', abi: erc20Token_1.interface }
  ],
  [tokens.WETH] : [
    { version: 1, address: '0xd0A1E359811322d97991E03f863a0C30C2cF029C', abi: dsEthToken_1.interface }
  ],
  [tokens.PETH] : [
    { version: 1, address: '0xf4d791139cE033Ad35DB2B2201435fAd668B1b64', abi: erc20Token_1.interface }
  ],
  [contracts.TOP] : [
    { version: 1, address: '0x....', abi: top_1.interface }
  ],
  [contracts.TUB] : [
    { version: 1, address: '0xa71937147b55Deb8a530C7229C442Fd3F31b7db2', abi: tub_1.interface }
  ]

};
export default mapping;