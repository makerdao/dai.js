import { defaultPsmTypes } from '../';
import {
  PSM_FEE_IN,
  PSM_FEE_OUT,
  TOKEN_ALLOWANCE_BASE,
  PSM_ALLOWANCE,
  COLLATERAL_DEBT_AVAILABLE,
  DEBT_CEILING,
  ENCUMBERED_COLLATERAL,
  PSM_TYPE_COLLATERAL_AMOUNT
} from './_constants';
import { fromRay } from '../utils';
import { ALLOWANCE_AMOUNT } from './token';

export const psmFeeIn = {
  generate: psmIlkName => {
    const contractName = `${psmIlkName.replace(/-/g, '_')}`;
    return {
      id: `${contractName}.feeIn`,
      contract: contractName,
      call: ['feeIn()(uint256)']
    };
  },
  returns: [[PSM_FEE_IN, fromRay]]
};

export const psmFeeOut = {
  generate: psmIlkName => {
    const contractName = `${psmIlkName.replace(/-/g, '_')}`;
    return {
      id: `${contractName}.feeIn`,
      contract: contractName,
      call: ['feeOut()(uint256)']
    };
  },
  returns: [[PSM_FEE_OUT, fromRay]]
};

export const psmFees = {
  generate: () => ({
    dependencies: [
      ...defaultPsmTypes.map(({ ilk }) => [PSM_FEE_IN, ilk]),
      ...defaultPsmTypes.map(({ ilk }) => [PSM_FEE_OUT, ilk])
    ],
    computed: (...fees) => {
      const feesIn = fees.slice(0, fees.length / 2);
      const feesOut = fees.slice(fees.length / 2, fees.length);
      return defaultPsmTypes.reduce(
        (acc, { ilk }, idx) => ({
          ...acc,
          [ilk]: { join: feesIn[idx], exit: feesOut[idx] }
        }),
        {}
      );
    }
  })
};

export const psmAllowance = {
  generate: (address, psmIlk, token) => ({
    dependencies: ({ get }) => {
      const psmIlkAddress = get('smartContract').getContractAddress(
        psmIlk.replace(/-/g, '_')
      );
      return [
        token === 'ETH'
          ? [[ALLOWANCE_AMOUNT]]
          : [TOKEN_ALLOWANCE_BASE, address, psmIlkAddress, token]
      ];
    },
    computed: v => v.isEqualTo(ALLOWANCE_AMOUNT)
  })
};

export const psmAllowances = {
  generate: address => ({
    dependencies: [
      ...defaultPsmTypes.map(({ ilk, currency }) => [
        PSM_ALLOWANCE,
        address,
        ilk,
        currency.symbol
      ]),
      ...defaultPsmTypes.map(({ ilk, pair }) => [
        PSM_ALLOWANCE,
        address,
        ilk,
        pair.symbol
      ])
    ],
    computed: (...allowances) => {
      const joinAllowance = allowances.slice(0, allowances.length / 2);
      const exitAllowance = allowances.slice(
        allowances.length / 2,
        allowances.length
      );
      return defaultPsmTypes.reduce(
        (acc, { ilk }, idx) => ({
          ...acc,
          [ilk]: { join: joinAllowance[idx], exit: exitAllowance[idx] }
        }),
        {}
      );
    }
  })
};

export const psmTypeCollateralAmount = {
  generate: psmIlk => ({
    dependencies: ({ get }) => {
      const psmIlkAddress = get('smartContract').getContractAddress(
        psmIlk.replace(/-/g, '_')
      );
      return [[ENCUMBERED_COLLATERAL, psmIlk, psmIlkAddress]];
    },
    computed: v => {
      const { currency } = defaultPsmTypes.find(types => types.ilk === psmIlk);
      return currency(v);
    }
  })
};

export const psmTypesInfo = {
  generate: () => ({
    dependencies: [
      ...defaultPsmTypes.map(({ ilk }) => [PSM_TYPE_COLLATERAL_AMOUNT, ilk]),
      ...defaultPsmTypes.map(({ ilk }) => [COLLATERAL_DEBT_AVAILABLE, ilk]),
      ...defaultPsmTypes.map(({ ilk }) => [DEBT_CEILING, ilk])
    ],
    computed: (...info) => {
      const collateralAmounts = info.slice(0, info.length / 3);
      const debtsAvailable = info.slice(info.length / 3, (info.length * 2) / 3);
      const debtCeilings = info.slice((info.length * 2) / 3, info.length);
      return defaultPsmTypes.reduce(
        (acc, { ilk }, idx) => ({
          ...acc,
          [ilk]: {
            collateral: collateralAmounts[idx],
            ceiling: debtCeilings[idx],
            debtAvailable: debtsAvailable[idx]
          }
        }),
        {}
      );
    }
  })
};

export default {
  psmFeeIn,
  psmFeeOut,

  // computed
  psmFees,
  psmAllowance,
  psmAllowances,
  psmTypeCollateralAmount,
  psmTypesInfo
};
