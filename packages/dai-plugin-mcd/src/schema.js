import { createCurrencyRatio } from '@makerdao/currency';
import { toHex, fromWei, fromRay, fromRad } from './utils';
import BigNumber from 'bignumber.js';
import { USD, ETH, BAT, MDAI } from '..';

export const proxyAddress = 'proxyAddress';

export const proxies = {
  generate: address => ({
    id: `PROXY_REGISTRY.proxies(${address})`,
    contractName: 'PROXY_REGISTRY',
    call: ['proxies(address)(address)', address]
  }),
  returns: [[proxyAddress]]
};

export const totalEncumberedDebt = 'totalEncumberedDebt';
export const debtScalingFactor = 'debtScalingFactor';
export const priceWithSafetyMargin = 'priceWithSafetyMargin';
export const debtCeiling = 'debtCeiling';
export const urnDebtFloor = 'urnDebtFloor';

export const ilks = {
  generate: ilkName => ({
    id: `MCD_VAT.ilks(${ilkName})`,
    contractName: 'MCD_VAT',
    call: [
      'ilks(bytes32)(uint256,uint256,uint256,uint256,uint256)',
      toHex(ilkName)
    ]
  }),
  returns: [
    [totalEncumberedDebt, BigNumber],
    [debtScalingFactor, fromRay],
    [priceWithSafetyMargin, fromRay],
    [debtCeiling, fromRad],
    [urnDebtFloor, fromRad]
  ]
};

export const totalDaiSupply = 'totalDaiSupply';
export const debt = {
  generate: () => ({
    id: `VAT.debt()`,
    contractName: 'MCD_VAT',
    call: ['debt()(uint256)']
  }),
  returns: [[totalDaiSupply, MDAI.rad]]
};

export const ilkPrices = {
  generate: ilkNames => ({
    // Dynamically generated dependencies
    dependencies: () => [
      ['refPerDai'],
      ...ilkNames.reduce((acc, ilk) => [...acc,
        ['priceWithSafetyMargin', ilk],
        ['liquidationRatio', ilk]
      ], [])
    ],
    computed: (refPerDai, ...results) =>
    results.reduce((acc, r, i) => {
      if (i % 2 === 0) {
        const currency = ETH;
        const priceWithSafetyMargin = results[i];
        const liquidationRatio = results[i + 1];
        const ratio = createCurrencyRatio(USD, currency);
        const price = priceWithSafetyMargin.times(refPerDai).times(liquidationRatio.toNumber());
        return [...acc, ratio(price)];
      }
      return acc;
    }, [])
  })
};

export const priceFeedAddress = 'priceFeedAddress';
export const liquidationRatio = 'liquidationRatio';
export const spotIlks = {
  generate: ilkName => ({
    id: `MCD_SPOT.ilks(${ilkName})`,
    contractName: 'MCD_SPOT',
    call: [
      'ilks(bytes32)(address,uint256)',
      toHex(ilkName)
    ],
  }),
  returns: [
    priceFeedAddress,
    [liquidationRatio, v => createCurrencyRatio(USD, MDAI)(BigNumber(fromRay(v)))]
  ]
};

export const refPerDai = 'refPerDai';
export const spotPar = {
  generate: () => ({
    id: 'MCD_SPOT.par()',
    contractName: 'MCD_SPOT',
    call: ['par()(uint256)'],
  }),
  returns: [
    [refPerDai, fromRay]
  ]
};

export default {
  ilks,
  proxies,
  debt,
  spotIlks,
  spotPar,
  ilkPrices,
};
