import { createCurrency, createCurrencyRatio } from '@makerdao/currency';
import {
  collateralValue as calcCollateralValue,
  daiAvailable as calcDaiAvailable,
  collateralizationRatio as calcCollateralizationRatio,
  liquidationPrice as calcLiquidationPrice,
  minSafeCollateralAmount as calcMinSafeCollateralAmount
} from '../math';
import { defaultCdpTypes } from '../';
import { USD, MDAI, DSR_DAI } from '../';

import {
  RATIO_DAI_USD,
  LIQUIDATION_RATIO,
  PRICE_WITH_SAFETY_MARGIN,
  COLLATERAL_TYPE_PRICE,
  VAULT_TYPE,
  VAULT_ADDRESS,
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
  RAW_LIQUIDATION_RATIO,
  UNLOCKED_COLLATERAL,
  SAVINGS_RATE_ACCUMULATOR,
  DAI_LOCKED_IN_DSR,
  TOKEN_BALANCE,
  LIQUIDATION_RATIO_SIMPLE,
  LIQUIDATION_PENALTY,
  ANNUAL_STABILITY_FEE
} from './constants';

export const collateralTypePrice = {
  generate: collateralTypeName => ({
    dependencies: [
      [RATIO_DAI_USD],
      [PRICE_WITH_SAFETY_MARGIN, collateralTypeName],
      [LIQUIDATION_RATIO, collateralTypeName]
    ],
    computed: (ratioDaiUsd, priceWithSafetyMargin, liquidationRatio) => {
      const currency = createCurrency(
        liquidationRatio.numerator.symbol.substring(1, 4)
      );
      const ratio = createCurrencyRatio(USD, currency);
      const price = priceWithSafetyMargin
        .times(ratioDaiUsd.toNumber())
        .times(liquidationRatio.toNumber());
      return ratio(price);
    }
  })
};

export const collateralTypesPrices = {
  generate: () => ({
    dependencies: () => [
      ...defaultCdpTypes.map(({ ilk: collateralTypeName }) => [
        COLLATERAL_TYPE_PRICE,
        collateralTypeName
      ])
    ],
    computed: (...prices) => prices
  })
};

export const vaultTypeAndAddress = {
  generate: id => ({
    dependencies: [[VAULT_TYPE, id], [VAULT_ADDRESS, id]],
    computed: (vaultType, vaultAddress) => [vaultType, vaultAddress]
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

export const collateralAmount = {
  generate: id => ({
    dependencies: [
      [VAULT_TYPE, id],
      [ENCUMBERED_COLLATERAL, [VAULT_TYPE, id], [VAULT_ADDRESS, id]]
    ],
    computed: (vaultType, encumberedCollateral) => {
      // Todo: better way to get collateral name
      const currency = createCurrency(vaultType.substring(0, 3));
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
      [RAW_LIQUIDATION_RATIO, [VAULT_TYPE, id]]
    ],
    computed: (collateralAmount, debtValue, rawLiquidationRatio) => {
      const ratio = createCurrencyRatio(USD, MDAI);
      const liquidationRatio = ratio(rawLiquidationRatio.toNumber());
      return calcLiquidationPrice(
        collateralAmount,
        debtValue,
        liquidationRatio
      );
    }
  })
};

export const daiAvailable = {
  generate: id => ({
    dependencies: [
      [COLLATERAL_VALUE, id],
      [DEBT_VALUE, id],
      [RAW_LIQUIDATION_RATIO, [VAULT_TYPE, id]]
    ],
    computed: (collateralValue, debtValue, rawLiquidationRatio) => {
      const ratio = createCurrencyRatio(USD, MDAI);
      const liquidationRatio = ratio(rawLiquidationRatio.toNumber());
      return calcDaiAvailable(collateralValue, debtValue, liquidationRatio);
    }
  })
};

export const minSafeCollateralAmount = {
  generate: id => ({
    dependencies: [
      [DEBT_VALUE, id],
      [RAW_LIQUIDATION_RATIO, [VAULT_TYPE, id]],
      [COLLATERAL_TYPE_PRICE, [VAULT_TYPE, id]]
    ],
    computed: (debtValue, rawLiquidationRatio, price) => {
      const ratio = createCurrencyRatio(USD, MDAI);
      const liquidationRatio = ratio(rawLiquidationRatio.toNumber());
      return calcMinSafeCollateralAmount(debtValue, liquidationRatio, price);
    }
  })
};
export const collateralAvailableAmount = {
  generate: id => ({
    dependencies: [[COLLATERAL_AMOUNT, id], [MIN_SAFE_COLLATERAL_AMOUNT, id]],
    computed: (collateralAmount, minSafeCollateralAmount) =>
      collateralAmount.minus(minSafeCollateralAmount)
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

export const liquidationRatioSimple = {
  generate: id => ({
    dependencies: [[RAW_LIQUIDATION_RATIO, [VAULT_TYPE, id]]],
    computed: rawLiquidationRatio => {
      const ratio = createCurrencyRatio(USD, MDAI);
      const liquidationRatio = ratio(rawLiquidationRatio.toNumber());
      return liquidationRatio;
    }
  })
};

export const vault = {
  generate: id => ({
    dependencies: [
      [VAULT_TYPE, id],
      [VAULT_ADDRESS, id],
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
      [LIQUIDATION_RATIO_SIMPLE, id],
      [LIQUIDATION_PENALTY, [VAULT_TYPE, id]],
      [ANNUAL_STABILITY_FEE, [VAULT_TYPE, id]]
    ],
    computed: (
      vaultType,
      vaultAddress,
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
      liquidationRatioSimple,
      liquidationPenalty,
      annualStabilityFee
    ) => ({
      vaultType,
      vaultAddress,
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
      liquidationRatioSimple,
      liquidationPenalty,
      annualStabilityFee
    })
  })
};

export const daiLockedInDsr = {
  generate: () => ({
    dependencies: ({ get }) => [
      [SAVINGS_DAI, [PROXY_ADDRESS, get('web3').currentAddress()]],
      [SAVINGS_RATE_ACCUMULATOR]
    ],
    computed: (savingsDai, savingsRateAccumulator) => {
      return DSR_DAI(savingsDai.times(savingsRateAccumulator));
    }
  })
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
  generate: symbol => ({
    dependencies: ({ get }) => {
      const address = get('web3').currentAddress();
      if (symbol === 'DSR-DAI') {
        return [[DAI_LOCKED_IN_DSR]];
      }
      return [[TOKEN_BALANCE, address, symbol]];
    },
    computed: v => v
  })
};

export default {
  collateralTypePrice,
  collateralTypesPrices,
  vaultTypeAndAddress,
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
  liquidationRatioSimple
};
