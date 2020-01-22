import { toHex, fromRay, fromRad, fromWei } from '../utils';
import BigNumber from 'bignumber.js';
import { MDAI } from '../..';

import {
  TOTAL_ENCUMBERED_DEBT,
  DEBT_SCALING_FACTOR,
  PRICE_WITH_SAFETY_MARGIN,
  DEBT_CEILING,
  DEBT_FLOOR,
  TOTAL_DAI_SUPPLY,
  ENCUMBERED_COLLATERAL,
  ENCUMBERED_DEBT,
  UNLOCKED_COLLATERAL
} from './constants';

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
    [DEBT_FLOOR, fromRad]
  ]
};

export const vatDebt = {
  generate: () => ({
    id: 'MCD_VAT.debt()',
    contractName: 'MCD_VAT',
    call: ['debt()(uint256)']
  }),
  returns: [[TOTAL_DAI_SUPPLY, v => MDAI(v, 'rad')]]
};

export const vatUrns = {
  generate: (ilkName, urn) => ({
    id: `MCD_Vat.urns(${ilkName},${urn})`,
    contractName: 'MCD_VAT',
    call: ['urns(bytes32,address)(uint256,uint256)', toHex(ilkName), urn]
  }),
  returns: [[ENCUMBERED_COLLATERAL, fromWei], [ENCUMBERED_DEBT, fromWei]]
};

export const vatGem = {
  generate: (ilkName, urn) => ({
    id: `MCD_Vat.gem(${ilkName},${urn})`,
    contractName: 'MCD_VAT',
    call: ['gem(bytes32,address)(uint)', toHex(ilkName), urn]
  }),
  return: [UNLOCKED_COLLATERAL, fromWei]
};

export default {
  vatIlks,
  vatDebt,
  vatUrns,
  vatGem
};
