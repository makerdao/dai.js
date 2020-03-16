import { createCurrency, createCurrencyRatio } from '@makerdao/currency';
import {
  collateralValue as calcCollateralValue,
  daiAvailable as calcDaiAvailable,
  collateralizationRatio as calcCollateralizationRatio,
  liquidationPrice as calcLiquidationPrice,
  minSafeCollateralAmount as calcMinSafeCollateralAmount
} from '../math';
import { USD, MDAI, DSR_DAI, defaultCdpTypes, ALLOWANCE_AMOUNT } from '../';
import BigNumber from 'bignumber.js';
import {
  RATIO_DAI_USD,
  LIQUIDATION_RATIO,
  PRICE_WITH_SAFETY_MARGIN,
  COLLATERAL_TYPE_PRICE,
  VAULT_TYPE,
  VAULT_ADDRESS,
  VAULT_OWNER,
  VAULT_EXTERNAL_OWNER,
  ENCUMBERED_COLLATERAL,
  ENCUMBERED_DEBT,
  SAVINGS_DAI,
  TOTAL_SAVINGS_DAI,
  PROXY_ADDRESS,
  DEBT_SCALING_FACTOR,
  DEBT_VALUE,
  COLLATERALIZATION_RATIO,
  COLLATERAL_AMOUNT,
  COLLATERAL_VALUE,
  LIQUIDATION_PRICE,
  DAI_AVAILABLE,
  MIN_SAFE_COLLATERAL_AMOUNT,
  COLLATERAL_AVAILABLE_AMOUNT,
  COLLATERAL_AVAILABLE_VALUE,
  UNLOCKED_COLLATERAL,
  SAVINGS_RATE_ACCUMULATOR,
  DAI_LOCKED_IN_DSR,
  TOKEN_BALANCE,
  LIQUIDATION_PENALTY,
  ANNUAL_STABILITY_FEE,
  TOKEN_ALLOWANCE,
  DEBT_FLOOR,
  PROXY_OWNER,
  ANNUAL_DAI_SAVINGS_RATE,
  DAI_SAVINGS_RATE,
  DATE_EARNINGS_LAST_ACCRUED,
  USER_VAULT_IDS,
  USER_VAULT_ADDRESSES,
  USER_VAULT_TYPES,
  VAULT,
  TOTAL_ENCUMBERED_DEBT,
  ADAPTER_BALANCE,
  COLLATERAL_DEBT,
  COLLATERAL_TYPE_COLLATERALIZATION,
  COLLATERAL_TYPE_DATA
} from './_constants';
import { validateAddress, validateVaultId } from './_validators';

export const collateralTypePrice = {
  generate: collateralTypeName => ({
    dependencies: [
      [RATIO_DAI_USD],
      [PRICE_WITH_SAFETY_MARGIN, collateralTypeName],
      [LIQUIDATION_RATIO, collateralTypeName]
    ],
    computed: (ratioDaiUsd, priceWithSafetyMargin, liquidationRatio) => {
      const [symbol] = collateralTypeName.split('-');
      const currency = createCurrency(symbol);
      const ratio = createCurrencyRatio(USD, currency);
      const price = priceWithSafetyMargin
        .times(ratioDaiUsd.toNumber())
        .times(liquidationRatio.toNumber());
      return ratio(price);
    }
  })
};

export const collateralTypesPrices = {
  generate: types => ({
    dependencies: () =>
      types.map(collateralTypeName => [
        COLLATERAL_TYPE_PRICE,
        collateralTypeName
      ]),
    computed: (...prices) => prices
  })
};

export const defaultCollateralTypesPrices = {
  generate: () => ({
    dependencies: () =>
      defaultCdpTypes.map(({ ilk: collateralTypeName }) => [
        COLLATERAL_TYPE_PRICE,
        collateralTypeName
      ]),
    computed: (...prices) => prices
  })
};

export const vaultTypeAndAddress = {
  generate: id => ({
    dependencies: [[VAULT_TYPE, id], [VAULT_ADDRESS, id]],
    computed: (vaultType, vaultAddress) => [vaultType, vaultAddress]
  })
};

export const vaultExternalOwner = {
  generate: id => ({
    dependencies: [[PROXY_OWNER, [VAULT_OWNER, id]], [VAULT_OWNER, id]],
    computed: owner => owner
  })
};

export const vaultCollateralAndDebt = {
  generate: (vaultType, vaultAddress) => ({
    dependencies: [
      [ENCUMBERED_COLLATERAL, vaultType, vaultAddress],
      [ENCUMBERED_DEBT, vaultType, vaultAddress]
    ],
    computed: (encumberedCollateral, encumberedDebt) => [
      encumberedCollateral,
      encumberedDebt
    ]
  })
};

// TODO This should also account for unencumbered collateral which is collateral on the
// join adapter
export const collateralAmount = {
  generate: id => ({
    dependencies: [
      [VAULT_TYPE, id],
      [ENCUMBERED_COLLATERAL, [VAULT_TYPE, id], [VAULT_ADDRESS, id]]
    ],
    computed: (vaultType, encumberedCollateral) => {
      const [symbol] = vaultType.split('-');
      const currency = createCurrency(symbol);
      return currency(encumberedCollateral);
    }
  })
};

export const collateralValue = {
  generate: id => ({
    dependencies: [
      [COLLATERAL_TYPE_PRICE, [VAULT_TYPE, id]],
      [COLLATERAL_AMOUNT, id]
    ],
    computed: (collateralTypePrice, collateralAmount) =>
      calcCollateralValue(collateralAmount, collateralTypePrice)
  })
};

export const debtValue = {
  generate: id => ({
    dependencies: [
      [ENCUMBERED_DEBT, [VAULT_TYPE, id], [VAULT_ADDRESS, id]],
      [DEBT_SCALING_FACTOR, [VAULT_TYPE, id]]
    ],
    computed: (encumberedDebt, debtScalingFactor) => {
      return MDAI(encumberedDebt).times(debtScalingFactor);
    }
  })
};

export const collateralizationRatio = {
  generate: id => ({
    dependencies: [[COLLATERAL_VALUE, id], [DEBT_VALUE, id]],
    computed: (collateralValue, debtValue) =>
      calcCollateralizationRatio(collateralValue, debtValue)
  })
};

export const liquidationPrice = {
  generate: id => ({
    dependencies: [
      [COLLATERAL_AMOUNT, id],
      [DEBT_VALUE, id],
      [LIQUIDATION_RATIO, [VAULT_TYPE, id]]
    ],
    computed: (collateralAmount, debtValue, liquidationRatio) =>
      calcLiquidationPrice(collateralAmount, debtValue, liquidationRatio)
  })
};

export const daiAvailable = {
  generate: id => ({
    dependencies: [
      [COLLATERAL_VALUE, id],
      [DEBT_VALUE, id],
      [LIQUIDATION_RATIO, [VAULT_TYPE, id]]
    ],
    computed: (collateralValue, debtValue, liquidationRatio) =>
      calcDaiAvailable(collateralValue, debtValue, liquidationRatio)
  })
};

export const minSafeCollateralAmount = {
  generate: id => ({
    dependencies: [
      [DEBT_VALUE, id],
      [LIQUIDATION_RATIO, [VAULT_TYPE, id]],
      [COLLATERAL_TYPE_PRICE, [VAULT_TYPE, id]]
    ],
    computed: (debtValue, liquidationRatio, price) =>
      calcMinSafeCollateralAmount(debtValue, liquidationRatio, price)
  })
};

export const collateralAvailableAmount = {
  generate: id => ({
    dependencies: [[COLLATERAL_AMOUNT, id], [MIN_SAFE_COLLATERAL_AMOUNT, id]],
    computed: (collateralAmount, minSafeCollateralAmount) => {
      if (
        minSafeCollateralAmount.toBigNumber().gt(collateralAmount.toBigNumber())
      ) {
        return createCurrency(collateralAmount.symbol)(0);
      } else {
        return collateralAmount.minus(minSafeCollateralAmount);
      }
    }
  })
};

export const collateralAvailableValue = {
  generate: id => ({
    dependencies: [
      [COLLATERAL_AVAILABLE_AMOUNT, id],
      [COLLATERAL_TYPE_PRICE, [VAULT_TYPE, id]]
    ],
    computed: (collateralAvailableAmount, collateralTypePrice) =>
      calcCollateralValue(collateralAvailableAmount, collateralTypePrice)
  })
};

export const collateralTypeData = {
  generate: collateralTypeName => ({
    dependencies: [
      [COLLATERAL_TYPE_PRICE, collateralTypeName],
      [ANNUAL_STABILITY_FEE, collateralTypeName],
      [LIQUIDATION_PENALTY, collateralTypeName],
      [LIQUIDATION_RATIO, collateralTypeName],
      [PRICE_WITH_SAFETY_MARGIN, collateralTypeName],
      [DEBT_FLOOR, collateralTypeName]
    ],
    computed: (
      collateralTypePrice,
      annualStabilityFee,
      liquidationPenalty,
      liquidationRatio,
      priceWithSafetyMargin,
      debtFloor
    ) => ({
      symbol: collateralTypeName,
      collateralTypePrice,
      annualStabilityFee,
      liquidationRatio,
      liquidationPenalty,
      priceWithSafetyMargin,
      debtFloor,
      calculateCollateralizationRatio(collateralAmount, debtValue) {
        return calcCollateralizationRatio(
          this.collateralTypePrice.times(collateralAmount),
          debtValue
        )
          .times(100)
          .toNumber();
      },
      calculateliquidationPrice(collateralAmount, debtValue) {
        return calcLiquidationPrice(
          collateralAmount,
          debtValue,
          this.liquidationRatio
        );
      },
      calculateMaxDai(collateralAmount) {
        return priceWithSafetyMargin.times(collateralAmount);
      }
    })
  })
};

export const collateralTypesData = {
  generate: types => ({
    dependencies: () =>
      types.map(collateralTypeName => [
        COLLATERAL_TYPE_DATA,
        collateralTypeName
      ]),
    computed: (...collateralTypes) => collateralTypes
  })
};

export const vault = {
  generate: id => ({
    dependencies: [
      [VAULT_TYPE, id],
      [VAULT_ADDRESS, id],
      [VAULT_OWNER, id],
      [VAULT_EXTERNAL_OWNER, id],
      [ENCUMBERED_COLLATERAL, [VAULT_TYPE, id], [VAULT_ADDRESS, id]],
      [ENCUMBERED_DEBT, [VAULT_TYPE, id], [VAULT_ADDRESS, id]],
      [COLLATERAL_TYPE_PRICE, [VAULT_TYPE, id]],
      [DEBT_VALUE, id],
      [COLLATERALIZATION_RATIO, id],
      [COLLATERAL_AMOUNT, id],
      [COLLATERAL_VALUE, id],
      [LIQUIDATION_PRICE, id],
      [DAI_AVAILABLE, id],
      [COLLATERAL_AVAILABLE_AMOUNT, id],
      [COLLATERAL_AVAILABLE_VALUE, id],
      [UNLOCKED_COLLATERAL, [VAULT_TYPE, id], [VAULT_ADDRESS, id]],
      [LIQUIDATION_RATIO, [VAULT_TYPE, id]],
      [LIQUIDATION_PENALTY, [VAULT_TYPE, id]],
      [ANNUAL_STABILITY_FEE, [VAULT_TYPE, id]],
      [DEBT_FLOOR, [VAULT_TYPE, id]]
    ],
    computed: (
      vaultType,
      vaultAddress,
      ownerAddress,
      externalOwnerAddress,
      encumberedCollateral,
      encumberedDebt,
      collateralTypePrice,
      debtValue,
      collateralizationRatio,
      collateralAmount,
      collateralValue,
      liquidationPrice,
      daiAvailable,
      collateralAvailableAmount,
      collateralAvailableValue,
      unlockedCollateral,
      liquidationRatio,
      liquidationPenalty,
      annualStabilityFee,
      debtFloor
    ) => ({
      id: parseInt(id),
      vaultType,
      vaultAddress,
      ownerAddress,
      externalOwnerAddress,
      encumberedCollateral,
      encumberedDebt,
      collateralTypePrice,
      debtValue,
      collateralizationRatio,
      collateralAmount,
      collateralValue,
      liquidationPrice,
      daiAvailable,
      collateralAvailableAmount,
      collateralAvailableValue,
      unlockedCollateral,
      liquidationRatio,
      liquidationPenalty,
      annualStabilityFee,
      debtFloor,
      calculateLiquidationPrice({
        collateralAmount = this.collateralAmount,
        debtValue = this.debtValue,
        liquidationRatio = this.liquidationRatio
      } = {}) {
        if (!collateralAmount || !debtValue || !liquidationRatio) return;
        return calcLiquidationPrice(
          collateralAmount,
          debtValue,
          liquidationRatio
        );
      },
      calculateCollateralizationRatio({
        collateralValue = this.collateralValue,
        debtValue = this.debtValue
      } = {}) {
        if (!collateralValue || !debtValue) return;
        return calcCollateralizationRatio(collateralValue, debtValue)
          .times(100)
          .toNumber();
      }
    })
  }),
  validate: {
    args: validateVaultId
  }
};

export const daiLockedInDsr = {
  generate: address => ({
    dependencies: [
      [SAVINGS_DAI, [PROXY_ADDRESS, address]],
      [SAVINGS_RATE_ACCUMULATOR]
    ],
    computed: (savingsDai, savingsRateAccumulator) => {
      return DSR_DAI(savingsDai.times(savingsRateAccumulator));
    }
  }),
  validate: {
    args: validateAddress`Invalid address for daiLockedInDsr: ${'address'}`
  }
};

export const totalDaiLockedInDsr = {
  generate: () => ({
    dependencies: [[TOTAL_SAVINGS_DAI], [SAVINGS_RATE_ACCUMULATOR]],
    computed: (totalSavingsDai, savingsRateAccumulator) => {
      return DSR_DAI(totalSavingsDai.times(savingsRateAccumulator));
    }
  })
};

export const balance = {
  generate: (symbol, address) => ({
    dependencies: () => {
      if (symbol === 'DSR-DAI') {
        return [[DAI_LOCKED_IN_DSR, address]];
      }
      return [[TOKEN_BALANCE, address, symbol]];
    },
    computed: v => v
  })
};

export const allowance = {
  generate: (symbol, address) => ({
    dependencies: [
      symbol === 'ETH'
        ? [[ALLOWANCE_AMOUNT]]
        : [TOKEN_ALLOWANCE, address, [PROXY_ADDRESS, address], symbol]
    ],
    computed: v => v.isEqualTo(ALLOWANCE_AMOUNT)
  })
};

export const savings = {
  generate: address => ({
    dependencies: [
      [ANNUAL_DAI_SAVINGS_RATE],
      [DAI_SAVINGS_RATE],
      [DATE_EARNINGS_LAST_ACCRUED],
      [DAI_LOCKED_IN_DSR, address],
      [PROXY_ADDRESS, address],
      [SAVINGS_RATE_ACCUMULATOR],
      [SAVINGS_DAI, [PROXY_ADDRESS, address]]
    ],
    computed: (
      annualDaiSavingsRate,
      daiSavingsRate,
      dateEarningsLastAccrued,
      daiLockedInDsr,
      proxyAddress,
      savingsRateAccumulator,
      savingsDai
    ) => ({
      annualDaiSavingsRate,
      daiSavingsRate,
      dateEarningsLastAccrued,
      daiLockedInDsr,
      proxyAddress,
      savingsRateAccumulator,
      savingsDai
    })
  }),
  validate: {
    args: validateAddress`Invalid address for savings: ${'address'}`
  }
};

export const userVaultsList = {
  generate: address => ({
    dependencies: ({ get }) => {
      const cdpManagerAddress = get('smartContract').getContractAddress(
        'CDP_MANAGER'
      );
      return [
        [USER_VAULT_IDS, cdpManagerAddress, [PROXY_ADDRESS, address]],
        [USER_VAULT_ADDRESSES, cdpManagerAddress, [PROXY_ADDRESS, address]],
        [USER_VAULT_TYPES, cdpManagerAddress, [PROXY_ADDRESS, address]]
      ];
    },
    computed: (ids, addresses, types) =>
      ids.reduce(
        (acc, id, idx) => [
          ...acc,
          {
            vaultId: id,
            vaultAddress: addresses[idx],
            vaultType: types[idx]
          }
        ],
        []
      )
  }),
  validate: {
    args: validateAddress`Invalid address for userVaultsList: ${'address'}`
  }
};

export const userVaultsData = {
  generate: ids => ({
    dependencies: ids.map(id => [VAULT, id]),
    computed: (...vaults) => vaults
  })
};

export const collateralDebt = {
  generate: collateralTypeName => ({
    dependencies: [
      [TOTAL_ENCUMBERED_DEBT, collateralTypeName],
      [DEBT_SCALING_FACTOR, collateralTypeName]
    ],
    computed: (totalEncumberedDebt, debtScalingFactor) => {
      return MDAI(totalEncumberedDebt).times(debtScalingFactor);
    }
  })
};

export const collateralTypeCollateralization = {
  generate: (collateralTypeName, percentage = true) => ({
    dependencies: [
      [COLLATERAL_DEBT, collateralTypeName],
      [COLLATERAL_TYPE_PRICE, collateralTypeName],
      [ADAPTER_BALANCE, collateralTypeName]
    ],
    computed: (debt, price, amount) => {
      const collateral = calcCollateralValue(amount, price.toBigNumber());
      const ratio = calcCollateralizationRatio(
        collateral,
        debt.toBigNumber()
      ).times(100);
      return percentage
        ? ratio
        : { collateralValue: collateral, debtValue: debt };
    }
  })
};

export const systemCollateralization = {
  generate: vaultTypes => ({
    dependencies: vaultTypes.map(vaultType => [
      COLLATERAL_TYPE_COLLATERALIZATION,
      vaultType,
      false
    ]),
    computed: (...collateralizationValues) => {
      const {
        totalCollateralValue,
        totalDebtValue
      } = collateralizationValues.reduce(
        (acc, { collateralValue, debtValue }) => ({
          totalCollateralValue: acc.totalCollateralValue.plus(
            collateralValue.toBigNumber()
          ),
          totalDebtValue: acc.totalDebtValue.plus(debtValue.toBigNumber())
        }),
        {
          totalCollateralValue: BigNumber(0),
          totalDebtValue: BigNumber(0)
        }
      );

      return calcCollateralizationRatio(
        totalCollateralValue,
        totalDebtValue
      ).times(100);
    }
  })
};

export const proxyOwner = {
  generate: address => ({
    dependencies: ({ get }) => [
      [
        async () => {
          try {
            return await get('smartContract')
              .get('transactionManager')
              .get('proxy')
              .getOwner(address);
          } catch (e) {
            return null;
          }
        }
      ]
    ],
    computed: owner => owner
  }),
  validate: {
    args: validateAddress`Invalid address for proxyOwner: ${'address'}`
  }
};

export default {
  collateralTypePrice,
  collateralTypesPrices,
  defaultCollateralTypesPrices,
  vaultTypeAndAddress,
  vaultExternalOwner,
  vaultCollateralAndDebt,
  vault,
  collateralAmount,
  collateralValue,
  debtValue,
  collateralizationRatio,
  liquidationPrice,
  daiAvailable,
  minSafeCollateralAmount,
  collateralAvailableAmount,
  collateralAvailableValue,
  daiLockedInDsr,
  totalDaiLockedInDsr,
  balance,
  allowance,
  savings,
  userVaultsList,
  userVaultsData,
  collateralDebt,
  collateralTypeCollateralization,
  systemCollateralization,
  proxyOwner,
  collateralTypeData,
  collateralTypesData
};
