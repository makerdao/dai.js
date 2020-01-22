import { createCurrency, createCurrencyRatio } from '@makerdao/currency';
import {
  collateralValue as calcCollateralValue,
  daiAvailable as calcDaiAvailable
} from '../math';
import { defaultCdpTypes } from '../';
import { USD, MDAI } from '../';

import {
  RATIO_DAI_USD,
  LIQUIDATION_RATIO,
  PRICE_WITH_SAFETY_MARGIN,
  COLLATERAL_TYPE_PRICE,
  VAULT_TYPE,
  VAULT_ADDRESS,
  ENCUMBERED_COLLATERAL,
  ENCUMBERED_DEBT,
  SAVINGS_DAI_BY_PROXY,
  PROXY_ADDRESS,
  DEBT_SCALING_FACTOR,
  DEBT_VALUE,
  COLLATERAL_VALUE,
  DAI_AVAILABLE,
  RAW_LIQUIDATION_RATIO
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

export const collateralValue = {
  generate: id => ({
    dependencies: [
      [VAULT_TYPE, id],
      [ENCUMBERED_COLLATERAL, [VAULT_TYPE, id], [VAULT_ADDRESS, id]],
      [COLLATERAL_TYPE_PRICE, [VAULT_TYPE, id]]
    ],
    computed: (ilkName, encumberedCollateral, collateralTypePrice) => {
      // Todo: better way to get collateral name
      const currency = createCurrency(ilkName.substring(0, 3));
      // Note: the first arg is collateralAmount calculation
      return calcCollateralValue(
        currency(encumberedCollateral),
        collateralTypePrice
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

export const vault = {
  generate: id => ({
    dependencies: [
      [VAULT_TYPE, id],
      [VAULT_ADDRESS, id],
      [ENCUMBERED_COLLATERAL, [VAULT_TYPE, id], [VAULT_ADDRESS, id]],
      [ENCUMBERED_DEBT, [VAULT_TYPE, id], [VAULT_ADDRESS, id]],
      [COLLATERAL_TYPE_PRICE, [VAULT_TYPE, id]],
      [DEBT_VALUE, id],
      [COLLATERAL_VALUE, id],
      [DAI_AVAILABLE, id],
      [VAULT_TYPE, id],
      [VAULT_ADDRESS, id],
      [ENCUMBERED_COLLATERAL, [VAULT_TYPE, id], [VAULT_ADDRESS, id]],
      [ENCUMBERED_DEBT, [VAULT_TYPE, id], [VAULT_ADDRESS, id]]
    ],
    computed: (
      vaultType,
      vaultAddress,
      encumberedCollateral,
      encumberedDebt,
      collateralTypePrice,
      debtValue,
      collateralValue,
      daiAvailable
    ) => ({
      vaultType,
      vaultAddress,
      encumberedCollateral,
      encumberedDebt,
      collateralTypePrice,
      debtValue,
      collateralValue,
      daiAvailable
    })
  })
};

export const savingsDai = {
  generate: address => ({
    dependencies: [[SAVINGS_DAI_BY_PROXY, [PROXY_ADDRESS, address]]],
    computed: savingsDai => savingsDai
  })
};

export default {
  collateralTypePrice,
  collateralTypesPrices,
  vaultTypeAndAddress,
  vaultCollateralAndDebt,
  vault,
  collateralValue,
  debtValue,
  daiAvailable,
  savingsDai
};
