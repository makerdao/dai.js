import { createCurrency, createCurrencyRatio } from '@makerdao/currency';
import { defaultCdpTypes } from '../';
import { USD } from '../';

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
  PROXY_ADDRESS
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

export const vaultById = {
  generate: id => ({
    dependencies: [
      [VAULT_TYPE, id],
      [VAULT_ADDRESS, id],
      [ENCUMBERED_COLLATERAL, [VAULT_TYPE, id], [VAULT_ADDRESS, id]],
      [ENCUMBERED_DEBT, [VAULT_TYPE, id], [VAULT_ADDRESS, id]]
    ],
    computed: (
      vaultType,
      vaultAddress,
      encumberedCollateral,
      encumberedDebt
    ) => ({
      vaultType,
      vaultAddress,
      encumberedCollateral,
      encumberedDebt
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
  vaultById,
  savingsDai
};
