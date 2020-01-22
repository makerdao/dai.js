import { TOKEN_BALANCE } from './constants';
import { fromWei } from '../utils';

export const tokenBalance = {
  generate: (address, symbol) => ({
    id: `balance.${symbol}.${address}`,
    contractName: symbol === 'ETH' ? 'MULTICALL' : symbol,
    call: [
      symbol === 'ETH'
        ? 'getEthBalance(address)(uint256)'
        : 'balanceOf(address)(uint256)',
      address
    ]
  }),
  returns: [[TOKEN_BALANCE, fromWei]]
};

export const balance = {
  generate: symbol => ({
    dependencies: ({ get }) => {
      const address = get('web3').currentAddress();
      return [[TOKEN_BALANCE, address, symbol]];
    },
    computed: v => v
  })
};

export default {
  tokenBalance,
  balance
};
