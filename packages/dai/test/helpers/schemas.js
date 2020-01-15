/* eslint-disable */
import BigNumber from 'bignumber.js';

function debtValue(art, rate) {
  art = fromWei(art);
  return art.times(rate).shiftedBy(-27);
}

export function padRight(string, chars, sign) {
  return string + new Array(chars - string.length + 1).join(sign ? sign : '0');
}

export function toHex(str, { with0x = true, rightPadding = 64 } = {}) {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }
  if (rightPadding > 0) result = padRight(result, rightPadding);
  return with0x ? '0x' + result : result;
}

export function fromWei(value) {
  return BigNumber(value).shiftedBy(-18);
}

export function fromRay(value) {
  return BigNumber(value).shiftedBy(-27);
}

export function fromRad(value) {
  return BigNumber(value).shiftedBy(-45);
}

const totalEncumberedDebt = 'totalEncumberedDebt';
const debtScalingFactor = 'debtScalingFactor';
const priceWithSafetyMargin = 'priceWithSafetyMargin';
const debtCeiling = 'debtCeiling';
const urnDebtFloor = 'urnDebtFloor';

export const ilk = {
  generate: ilkName => ({
    id: `MCD_VAT.ilks(${ilkName})`,
    contractName: 'MCD_VAT',
    call: [
      'ilks(bytes32)(uint256,uint256,uint256,uint256,uint256)',
      toHex(ilkName)
    ]
  }),
  returns: [
    totalEncumberedDebt,
    [debtScalingFactor, fromRay],
    priceWithSafetyMargin,
    [debtCeiling, fromRad],
    urnDebtFloor
  ]
};

export const ilkDebt = {
  generate: ilkName => ({
    dependencies: [
      ['totalEncumberedDebt', ilkName],
      ['debtScalingFactor', ilkName]
    ],
    computed: (art, rate) => {
      console.log('ilkDebt computed:', art, rate)
      return debtValue(art, rate);
    }
  })
};

export const testComputed1 = {
  generate: ilkName => ({
    dependencies: [
      ['debtScalingFactor', ilkName],
      ['debtCeiling', ilkName]
    ],
    computed: (debtScalingFactor, debtCeiling) => Number(debtScalingFactor) + Number(debtCeiling)
  }),
};

export const testComputed2 = {
  generate: multiplyBy => ({
    dependencies: [
      ['testComputed1', 'ETH-A']
    ],
    computed: testComputed1 => testComputed1 * multiplyBy
  }),
};

export const testComputed3 = {
  generate: multiplyBy => ({
    dependencies: [
      ['testComputed2', 10],
      [() => new Promise(resolve => resolve(multiplyBy))]
    ],
    computed: (testComputed2, promiseResult) => testComputed2 * promiseResult
  })
};

export const ilkDebtCeilings = {
  generate: ilks => ({
    // Dynamically generate dependencies
    dependencies: () => ilks.map(ilkName => ['debtCeiling', ilkName]),
    computed: (...results) => results.map(r => Number(r))
  })
};

export default {
  ilk,
  ilkDebt,
  testComputed1,
  testComputed2,
  testComputed3,
  ilkDebtCeilings
};
