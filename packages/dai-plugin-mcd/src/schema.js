/* eslint-disable */
import { createCurrency, createCurrencyRatio } from '@makerdao/currency';
import { toHex, bytesToString, fromWei, fromWad, fromRay, fromRad } from './utils';
import BigNumber from 'bignumber.js';
import { USD, ETH, BAT, MDAI } from '..';
import { first } from 'rxjs/operators';

export const PROXY_ADDRESS = 'proxyAddress';

export const proxies = {
  generate: address => ({
    id: `PROXY_REGISTRY.proxies(${address})`,
    contractName: 'PROXY_REGISTRY',
    call: ['proxies(address)(address)', address]
  }),
  returns: [[PROXY_ADDRESS]]
};

export const TOTAL_ENCUMBERED_DEBT = 'totalEncumberedDebt';
export const DEBT_SCALING_FACTOR = 'debtScalingFactor';
export const PRICE_WITH_SAFETY_MARGIN = 'priceWithSafetyMargin';
export const DEBT_CEILING = 'debtCeiling';
export const URN_DEBT_FLOOR = 'urnDebtFloor';

export const vatIlks = {
  generate: ilkName => ({
    id: `MCD_VAT.ilks(${ilkName})`,
    contractName: 'MCD_VAT',
    call: [
      'ilks(bytes32)(uint256,uint256,uint256,uint256,uint256)',
      toHex(ilkName)
    ]
  }),
  returns: [
    [TOTAL_ENCUMBERED_DEBT, BigNumber],
    [DEBT_SCALING_FACTOR, fromRay],
    [PRICE_WITH_SAFETY_MARGIN, fromRay],
    [DEBT_CEILING, MDAI.rad],
    [URN_DEBT_FLOOR, fromRad]
  ]
};

export const TOTAL_DAI_SUPPLY = 'totalDaiSupply';
export const debt = {
  generate: () => ({
    id: 'VAT.debt()',
    contractName: 'MCD_VAT',
    call: ['debt()(uint256)']
  }),
  returns: [[TOTAL_DAI_SUPPLY, MDAI.rad]]
};

export const PRICE_FEED_ADDRESS = 'priceFeedAddress';
export const RAW_LIQUIDATION_RATIO = 'rawLiquidationRatio';

export const spotIlks = {
  generate: ilkName => ({
    id: `MCD_SPOT.ilks(${ilkName})`,
    contractName: 'MCD_SPOT',
    call: ['ilks(bytes32)(address,uint256)', toHex(ilkName)]
  }),
  returns: [PRICE_FEED_ADDRESS, [RAW_LIQUIDATION_RATIO, fromRay]]
};

export const LIQUIDATION_RATIO = 'liquidationRatio';
export const liquidationRatio = {
  // The liquidation ratio value is the minimum dollar amount of collateral in
  // terms of a single dollar unit amount of debt
  //
  // In plain english, it is the ratio of the dollar amount of ETH in terms of
  // the dollar amount of dai
  generate: ilkName => ({
    dependencies: () => [[RAW_LIQUIDATION_RATIO, ilkName]],
    computed: liqRatio =>
      createCurrencyRatio(
        createCurrency(`(${ilkName.split('-')[0]}/USD)`),
        createCurrency(`(${MDAI.symbol}/USD)`)
      )(liqRatio)
  })
};

export const RATIO_DAI_USD = 'ratioDaiUsd';
export const spotPar = {
  generate: () => ({
    id: 'MCD_SPOT.par()',
    contractName: 'MCD_SPOT',
    call: ['par()(uint256)']
  }),
  returns: [[RATIO_DAI_USD, v => createCurrencyRatio(MDAI, USD)(fromRay(v))]]
};

export const ILK_PRICE = 'ilkPrice';
export const ilkPrice = {
  generate: ilkName => ({
    dependencies: [
      [RATIO_DAI_USD],
      [PRICE_WITH_SAFETY_MARGIN, ilkName],
      [LIQUIDATION_RATIO, ilkName]
    ],
    computed: (ratioDaiUsd, priceWithSafetyMargin, liquidationRatio) => {
      const currency = createCurrency(liquidationRatio.numerator.symbol.substring(1, 4));
      const ratio = createCurrencyRatio(USD, currency);
      const price = priceWithSafetyMargin
        .times(ratioDaiUsd.toNumber())
        .times(liquidationRatio.toNumber());
      return ratio(price);
    }
  })
};

export const ILK_PRICES = 'ilkPrices';
export const ilkPrices = {
  generate: ilkNames => ({
    dependencies: () => [
      ...ilkNames.map(ilkName => [ILK_PRICE, ilkName])
    ],
    computed: (...prices) => prices
  })
};

export const UNLOCKED_COLLATERAL = 'unlockedCollateral';
export const vatGem = {
  generate: (ilkName, urn) => ({
    id: `MCD_Vat.gem(${ilkName},${urn})`,
    contractName: 'MCD_VAT',
    call: ['gem(bytes32,address)(uint)', toHex(ilkName), urn]
  }),
  return: [UNLOCKED_COLLATERAL, fromWei]
};

export const URN_INK = 'urnInk';
export const URN_ART = 'urnArt';
export const urnState = {
  generate: (ilkName, urn) => ({
    id: `MCD_Vat.urns(${ilkName},${urn})`,
    contractName: 'MCD_VAT',
    call: ['urns(bytes32,address)(uint256,uint256)', toHex(ilkName), urn]
  }),
  returns: [[URN_INK, fromWei], [URN_ART, fromWei]]
};

export const VAULT_URN = 'vaultUrn';
export const vaultUrn = {
  generate: id => ({
    id: `CDP_MANAGER.urns(${id})`,
    contractName: 'CDP_MANAGER',
    call: ['urns(uint256)(address)', parseInt(id)]
  }),
  returns: [
    VAULT_URN
  ]
};

export const VAULT_ILK = 'vaultIlk';
export const vaultIlk = {
  generate: id => ({
    id: `CDP_MANAGER.ilks(${id})`,
    contractName: 'CDP_MANAGER',
    call: ['ilks(uint256)(bytes32)', parseInt(id)]
  }),
  returns: [[VAULT_ILK, bytesToString]]
};

export const VAULT_ILK_AND_URN = 'vaultIlkAndUrn';
export const vaultIlkAndUrn = {
  generate: id => ({
    dependencies: [
      [VAULT_ILK, id],
      [VAULT_URN, id]
    ],
    computed: (ilk, urn) => [ilk, urn]
  })
};

export const URN_INK_AND_ART = 'urnInkAndArt';
export const urnInkAndArt = {
  generate: (ilk, urn) => ({
    dependencies: [
      [URN_INK, ilk, urn],
      [URN_ART, ilk, urn]
    ],
    computed: (ink, art) => [ink, art]
  })
};

export const VAULT_BY_ID = 'vaultById';
export const vaultById = {
  generate: id => ({
    dependencies: (watch) => ([
      [() => new Promise(resolve => {
        watch(VAULT_ILK_AND_URN, id).pipe(first()).toPromise().then(([ilk, urn]) => {
          watch(URN_INK_AND_ART, ilk, urn).pipe(first()).toPromise().then(([ink, art]) => {
            resolve([ilk, urn, ink, art])
          })
        });
      })]
    ]),
    computed: ([ilk, urn, ink, art]) => ({ ilk, urn, ink, art })
  })
};

export default {
  vatIlks,
  proxies,
  debt,
  spotIlks,
  spotPar,
  ilkPrice,
  ilkPrices,
  liquidationRatio,
  vatGem,
  urnState,
  vaultUrn,
  vaultIlk,
  vaultIlkAndUrn,
  urnInkAndArt,
  vaultById
};
