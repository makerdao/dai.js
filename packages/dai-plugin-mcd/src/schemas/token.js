import { getMcdToken } from '../utils';
import BigNumber from 'bignumber.js';

import { TOKEN_BALANCE, TOKEN_ALLOWANCE } from './constants';

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
      transforms: {
        [TOKEN_BALANCE]: v => currencyToken(v, 'wei')
      }
    };
  },
  returns: [TOKEN_BALANCE]
};

export const tokenAllowance = {
  generate: (address, proxyAddress, symbol) => {
    if (symbol === 'WETH') symbol = 'MWETH';
    if (symbol === 'DAI') symbol = 'MDAI';
    if (symbol === 'ETH' || symbol === 'DSR-DAI')
      throw new Error(`${symbol} does not require an allowance to be set`);

    const currencyToken = getMcdToken(symbol);
    const contract =
      symbol === 'MDAI' ? 'MCD_DAI' : symbol === 'MWETH' ? 'ETH' : symbol;
    if (!currencyToken)
      throw new Error(`${symbol} token is not part of the default tokens list`);

    return {
      id: `allowance.${symbol}.${address}`,
      contractName: contract,
      call: ['allowance(address,address)(uint256)', address, proxyAddress]
    };
  },
  returns: [[TOKEN_ALLOWANCE, v => BigNumber(v)]]
};

export default {
  tokenBalance,
  tokenAllowance
};
