/* eslint-disable */
import { createCurrency, createCurrencyRatio } from '@makerdao/currency';
import {
  toHex,
  bytesToString,
  fromWei,
  fromWad,
  fromRay,
  fromRad
} from './utils';
import BigNumber from 'bignumber.js';
import { USD, ETH, BAT, MDAI, CHAI } from '..';
import { annualStabilityFee, liquidationPenalty } from './math';
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
    [DEBT_CEILING, v => MDAI(v, 'rad')],
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
  returns: [[TOTAL_DAI_SUPPLY, v => MDAI(v, 'rad')]]
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
  // The liquidation ratio value is the ratio between the minimum dollar amount of a unit of
  // collateral in terms of a single dollar unit amount of debt in which the system does not
  // deem a vault of that collateral type (ilk) underwater
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

export const ILK_PRICES = 'ilkPrices';
export const ilkPrices = {
  generate: ilkNames => ({
    dependencies: () => [...ilkNames.map(ilkName => [ILK_PRICE, ilkName])],
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

export const ENCUMBERED_COLLATERAL = 'encumberedCollateral';
export const ENCUMBERED_DEBT = 'encumberedDebt';
export const urnState = {
  generate: (ilkName, urn) => ({
    id: `MCD_Vat.urns(${ilkName},${urn})`,
    contractName: 'MCD_VAT',
    call: ['urns(bytes32,address)(uint256,uint256)', toHex(ilkName), urn]
  }),
  returns: [[ENCUMBERED_COLLATERAL, fromWei], [ENCUMBERED_DEBT, fromWei]]
};

export const VAULT_URN = 'vaultUrn';
export const vaultUrn = {
  generate: id => ({
    id: `CDP_MANAGER.urns(${id})`,
    contractName: 'CDP_MANAGER',
    call: ['urns(uint256)(address)', parseInt(id)]
  }),
  returns: [VAULT_URN]
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
    dependencies: [[VAULT_ILK, id], [VAULT_URN, id]],
    computed: (ilk, urn) => [ilk, urn]
  })
};

export const URN_COLLATERAL_AND_DEBT = 'urnCollateralAndDebt';
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

export const VAULT_BY_ID = 'vaultById';
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

export const ANNUAL_STABILITY_FEE = 'annualStabilityFee';
export const DATE_STABILITY_FEES_LAST_LEVIED = 'dateStabilityFeesLastLevied';
export const jugInfo = {
  generate: ilkName => ({
    id: `MCD_JUG.ilks(${ilkName})`,
    contractName: 'MCD_JUG',
    call: ['ilks(bytes32)(uint256,uint48)', toHex(ilkName)]
  }),
  returns: [
    [ANNUAL_STABILITY_FEE, annualStabilityFee],
    [DATE_STABILITY_FEES_LAST_LEVIED, val => new Date(val * 1000)]
  ]
};

export const TOTAL_SAVINGS_DAI = 'totalSavingsDai';
export const potPie = {
  generate: () => ({
    id: `MCD_POT.Pie`,
    contractName: 'MCD_POT',
    call: ['Pie()(uint256)']
  }),
  returns: [[TOTAL_SAVINGS_DAI, v => CHAI(v, 'wei')]]
};

export const SAVINGS_DAI_BY_PROXY = 'savingsDaiByProxy';
export const potpie = {
  generate: proxyAddress => ({
    id: `MCD_POT.pie(${proxyAddress})`,
    contractName: 'MCD_POT',
    call: ['pie(address)(uint256)', proxyAddress]
  }),
  returns: [[SAVINGS_DAI_BY_PROXY, v => CHAI(v, 'wei')]]
};

export const SAVINGS_DAI = 'savingsDai';
export const savingsDai = {
  generate: address => ({
    dependencies: [[SAVINGS_DAI_BY_PROXY, [PROXY_ADDRESS, address]]],
    computed: savingsDai => savingsDai
  })
};

export const DAI_SAVINGS_RATE = 'daiSavingsRate';
export const potDsr = {
  generate: () => ({
    id: `MCD_POT.dsr`,
    contractName: 'MCD_POT',
    call: ['dsr()(uint256)']
  }),
  returns: [[DAI_SAVINGS_RATE, fromRay]]
};

export const ANNUAL_DAI_SAVINGS_RATE = 'annualDaiSavingsRate';
export const annualDaiSavingsRate = {
  generate: () => ({
    dependencies: () => [[DAI_SAVINGS_RATE]],
    computed: daiSavingsRate =>
      daiSavingsRate
        .pow(365 * 24 * 60 * 60)
        .minus(1)
        .times(100)
  })
};

export const DATE_EARNINGS_LAST_ACCRUED = 'dateEarningsLastAccrued';
export const potRho = {
  generate: () => ({
    id: `MCD_POT.rho`,
    contractName: 'MCD_POT',
    call: ['rho()(uint256)']
  }),
  returns: [
    [DATE_EARNINGS_LAST_ACCRUED, val => new Date(val.toNumber() * 1000)]
  ]
};

export const LIQUIDATOR_ADDRESS = 'liquidatorAddress';
export const LIQUIDATION_PENALTY = 'liquidationPenalty';
export const MAX_AUCTION_LOT_SIZE = 'maxAuctionLotSize';
export const liquidatorState = {
  generate: ilkName => ({
    id: `MCD_CAT.ilks(${ilkName})`,
    contractName: 'MCD_CAT',
    call: ['ilks(bytes32)(address,uint256,uint256)', toHex(ilkName)]
  }),
  returns: [
    [LIQUIDATOR_ADDRESS],
    [LIQUIDATION_PENALTY, liquidationPenalty],
    [MAX_AUCTION_LOT_SIZE, v => BigNumber(v).shiftedBy(-18)]
  ]
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
  urnCollateralAndDebt,
  vaultById,
  jugInfo,
  potPie,
  potpie,
  savingsDai,
  potDsr,
  annualDaiSavingsRate,
  potRho,
  liquidatorState
};
