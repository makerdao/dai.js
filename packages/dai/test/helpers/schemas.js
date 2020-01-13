import BigNumber from 'bignumber.js';

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

const TOTAL_ENCUMBERED_DEBT = 'totalEncumberedDebt';
const DEBT_SCALING_FACTOR = 'debtScalingFactor';
const PRICE_WITH_SAFETY_MARGIN = 'priceWithSafetyMargin';
const DEBT_CEILING = 'debtCeiling';
const URN_DEBT_FLOOR = 'urnDebtFloor';

const TEST_COMPUTED_1 = 'testComputed1';
const TEST_COMPUTED_2 = 'testComputed2';

export const ilk = {
  generate: ilkName => ({
    id: `MCD_VAT.ilks(${ilkName})`,
    contractName: 'MCD_VAT',
    call: [
      'ilks(bytes32)(uint256,uint256,uint256,uint256,uint256)',
      toHex(ilkName)
    ],
    returns: [
      [`${TOTAL_ENCUMBERED_DEBT}.${ilkName}`], // Art
      [`${DEBT_SCALING_FACTOR}.${ilkName}`, fromRay], // rate
      [`${PRICE_WITH_SAFETY_MARGIN}.${ilkName}`], // spot
      [`${DEBT_CEILING}.${ilkName}`, fromRad], // line
      [`${URN_DEBT_FLOOR}.${ilkName}`] // dust
    ]
  }),
  keys: [
    TOTAL_ENCUMBERED_DEBT,
    DEBT_SCALING_FACTOR,
    PRICE_WITH_SAFETY_MARGIN,
    DEBT_CEILING,
    URN_DEBT_FLOOR
  ]
};

export const testComputed1 = {
  generate: ilkName => ({
    dependencies: [[DEBT_SCALING_FACTOR, ilkName], [DEBT_CEILING, ilkName]],
    computed: (val1, val2) => Number(val1) + Number(val2)
  }),
  key: TEST_COMPUTED_1
};

export const testComputed2 = {
  generate: multiplyBy => ({
    dependencies: [[TEST_COMPUTED_1, 'ETH-A']],
    computed: val1 => Number(val1) * multiplyBy
  }),
  key: TEST_COMPUTED_2
};

export default {
  ilk,
  testComputed1,
  testComputed2
};
