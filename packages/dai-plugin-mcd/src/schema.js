import { toHex, fromWei, fromRay, fromRad } from './utils';
import { combineLatest } from 'rxjs';
import BigNumber from 'bignumber.js';
import { MDAI } from '..';

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

export default {
  ilks,
  proxies,
  debt
};
