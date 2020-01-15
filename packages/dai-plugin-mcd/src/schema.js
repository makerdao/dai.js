import { toHex, fromWei, fromRay, fromRad } from './utils';
import { combineLatest } from 'rxjs';

export const totalEncumberedDebt = 'totalEncumberedDebt';
export const debtScalingFactor = 'debtScalingFactor';
export const priceWithSafetyMargin = 'priceWithSafetyMargin';
export const debtCeiling = 'debtCeiling';
export const urnDebtFloor = 'urnDebtFloor';

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

export default {
  ilk
};
