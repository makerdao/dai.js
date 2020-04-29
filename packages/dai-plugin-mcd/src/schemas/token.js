import { getMcdToken } from '../utils';
import BigNumber from 'bignumber.js';

import { TOKEN_BALANCE, TOKEN_ALLOWANCE_BASE } from './_constants';
import { validateAddress } from './_validators';

export const ALLOWANCE_AMOUNT = BigNumber(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
);

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
      contract: symbol === 'ETH' ? 'MULTICALL' : contract,
      call: [
        symbol === 'ETH'
          ? 'getEthBalance(address)(uint256)'
          : 'balanceOf(address)(uint256)',
        address
      ],
      transforms: {
        [TOKEN_BALANCE]: v => {
          if (symbol === 'USDC') {
            return currencyToken(v, -6);
          } else if (symbol === 'WBTC') {
            return currencyToken(v, -8);
          } else {
            return currencyToken(v, 'wei');
          }
        }
      }
    };
  },
  returns: [TOKEN_BALANCE]
};

export const tokenBalances = {
  generate: (address, symbols) => ({
    dependencies: symbols.map(symbol => [TOKEN_BALANCE, address, symbol]),
    computed: (...balances) => balances
  })
};

export const tokenAllowanceBase = {
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
      contract: contract,
      call: ['allowance(address,address)(uint256)', address, proxyAddress]
    };
  },
  returns: [[TOKEN_ALLOWANCE_BASE, v => BigNumber(v)]]
};

export const tokenAllowance = {
  generate: (address, proxyAddress, symbol) => ({
    dependencies: [
      symbol === 'ETH'
        ? [[ALLOWANCE_AMOUNT]]
        : [TOKEN_ALLOWANCE_BASE, address, proxyAddress, symbol]
    ],
    computed: v => v
  }),
  validate: {
    args: (address, proxyAddress) =>
      validateAddress`Invalid address for tokenAllowance: ${'address'}`(
        address
      ) ||
      validateAddress`Invalid proxy address for tokenAllowance: ${'address'}`(
        proxyAddress
      )
  }
};

export const adapterBalance = {
  generate: collateralTypeName => ({
    dependencies: ({ get }) => {
      collateralTypeName =
        collateralTypeName === 'MDAI' ? 'DAI' : collateralTypeName;
      let tokenSymbol = collateralTypeName.split('-')[0];
      tokenSymbol = tokenSymbol === 'ETH' ? 'MWETH' : tokenSymbol;
      return [
        [
          TOKEN_BALANCE,
          get('smartContract').getContractAddress(
            `MCD_JOIN_${collateralTypeName.replace('-', '_')}`
          ),
          tokenSymbol
        ]
      ];
    },
    computed: v => v
  })
};

export default {
  tokenBalance,
  tokenAllowanceBase,

  // computed
  adapterBalance,
  tokenAllowance,
  tokenBalances
};
