import { TOKEN_BALANCE } from './constants';
import { getMcdToken } from '../utils';

export const tokenBalance = {
  generate: (address, symbol) => {
    if (symbol === 'WETH') symbol = 'MWETH';
    if (symbol === 'DAI') symbol = 'MDAI';

    const currencyToken = getMcdToken(symbol);
    const contract =
      symbol === 'MDAI' ? 'MCD_DAI' : symbol === 'MWETH' ? 'ETH' : symbol;
    if (!currencyToken)
      throw new Error(`${symbol} token is not part of the default tokens list`);
    if (symbol === 'DSR-DAI')
      throw new Error(
        "Balance of DAI in savings cannot be retrieved from a token contract call. To get DAI balance in savings call 'balance('DSR-DAI')'"
      );

    return {
      id: `balance.${symbol}.${address}`,
      contractName: symbol === 'ETH' ? 'MULTICALL' : contract,
      call: [
        symbol === 'ETH'
          ? 'getEthBalance(address)(uint256)'
          : 'balanceOf(address)(uint256)',
        address
      ],
      returns: [TOKEN_BALANCE, v => currencyToken(v, 'wei')]
    };
  },
  returns: [TOKEN_BALANCE]
};

export default {
  tokenBalance
};
