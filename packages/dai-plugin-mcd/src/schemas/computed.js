import { createCurrency, createCurrencyRatio } from '@makerdao/currency';
import { USD, MDAI } from '../..';
import {
  collateralValue as calcCollateralValue,
  daiAvailable as calcDaiAvailable
} from '../math';

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
  PROXY_ADDRESS,
  DEBT_SCALING_FACTOR,
  DEBT_VALUE,
  COLLATERAL_VALUE,
  DAI_AVAILABLE,
  RAW_LIQUIDATION_RATIO
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

export const debtValue = {
  generate: id => ({
    dependencies: [
      [ENCUMBERED_DEBT, [VAULT_ILK, id], [VAULT_URN, id]],
      [DEBT_SCALING_FACTOR, [VAULT_ILK, id]]
    ],
    computed: (encumberedDebt, debtScalingFactor) => {
      return MDAI(encumberedDebt).times(debtScalingFactor);
    }
  })
};

export const collateralValue = {
  generate: id => ({
    dependencies: [
      [VAULT_ILK, id],
      [ENCUMBERED_COLLATERAL, [VAULT_ILK, id], [VAULT_URN, id]],
      [ILK_PRICE, [VAULT_ILK, id]]
    ],
    computed: (ilkName, encumberedCollateral, ilkPrice) => {
      // Todo: better way to get collateral name
      const currency = createCurrency(ilkName.substring(0, 3));
      // Note: the first arg is collateralAmount calculation
      return calcCollateralValue(currency(encumberedCollateral), ilkPrice);
    }
  })
};

export const daiAvailable = {
  generate: id => ({
    dependencies: [
      [COLLATERAL_VALUE, id],
      [DEBT_VALUE, id],
      [RAW_LIQUIDATION_RATIO, [VAULT_ILK, id]]
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
      [VAULT_ILK, id],
      [VAULT_URN, id],
      [ENCUMBERED_COLLATERAL, [VAULT_ILK, id], [VAULT_URN, id]],
      [ENCUMBERED_DEBT, [VAULT_ILK, id], [VAULT_URN, id]],
      [ILK_PRICE, [VAULT_ILK, id]],
      [DEBT_VALUE, id],
      [COLLATERAL_VALUE, id],
      [DAI_AVAILABLE, id]
    ],
    computed: (
      ilk,
      urn,
      encumberedCollateral,
      encumberedDebt,
      ilkPrice,
      debtValue,
      collateralValue,
      daiAvailable
    ) => ({
      ilk,
      urn,
      encumberedCollateral,
      encumberedDebt,
      ilkPrice,
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
  ilkPrice,
  ilkPrices,
  vaultIlkAndUrn,
  urnCollateralAndDebt,
  vault,
  collateralValue,
  debtValue,
  daiAvailable,
  savingsDai
};
