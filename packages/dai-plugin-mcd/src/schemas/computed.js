import { createCurrency, createCurrencyRatio } from '@makerdao/currency';
import { USD } from '../..';

import {
  RATIO_DAI_USD,
  LIQUIDATION_RATIO,
  PRICE_WITH_SAFETY_MARGIN,
  ILK_PRICE,
  VAULT_ILK,
  VAULT_URN,
  ENCUMBERED_COLLATERAL,
  ENCUMBERED_DEBT,
  SAVINGS_DAI_BY_PROXY,
  PROXY_ADDRESS
} from './constants';

export const ilkPrice = {
  generate: ilkName => ({
    dependencies: [
      [RATIO_DAI_USD],
      [PRICE_WITH_SAFETY_MARGIN, ilkName],
      [LIQUIDATION_RATIO, ilkName]
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

export const ilkPrices = {
  generate: ilkNames => ({
    dependencies: () => [...ilkNames.map(ilkName => [ILK_PRICE, ilkName])],
    computed: (...prices) => prices
  })
};

export const vaultIlkAndUrn = {
  generate: id => ({
    dependencies: [[VAULT_ILK, id], [VAULT_URN, id]],
    computed: (ilk, urn) => [ilk, urn]
  })
};

export const urnCollateralAndDebt = {
  generate: (ilk, urn) => ({
    dependencies: [
      [ENCUMBERED_COLLATERAL, ilk, urn],
      [ENCUMBERED_DEBT, ilk, urn]
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
      [VAULT_ILK, id],
      [VAULT_URN, id],
      [ENCUMBERED_COLLATERAL, [VAULT_ILK, id], [VAULT_URN, id]],
      [ENCUMBERED_DEBT, [VAULT_ILK, id], [VAULT_URN, id]]
    ],
    computed: (ilk, urn, encumberedCollateral, encumberedDebt) => ({
      ilk,
      urn,
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
  ilkPrice,
  ilkPrices,
  vaultIlkAndUrn,
  urnCollateralAndDebt,
  vaultById,
  savingsDai
};
