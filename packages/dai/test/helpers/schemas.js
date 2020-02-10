import { fromWei, numberToBytes32, bytesToString } from '../../src/utils/conversion';
import BigNumber from 'bignumber.js';

export const TOTAL_CDP_DEBT = 'totalCdpDebt';
export const CDP_COUNT = 'cdpCount';
export const CDP_OWNER = 'cdpOwner';
export const CDP_COLLATERAL = 'cdpCollateral';
export const CDP_DEBT = 'cdpDebt';
export const CDP_IRE = 'cdpIre';
export const DEBT_CEILING = 'debtCeiling';
export const ETH_PRICE = 'ethPrice';
export const CDP_COLLATERAL_VALUE = 'cdpCollateralValue';
export const LAST_CREATED_CDP_COLLATERAL_VALUE = 'lastCreatedCdpCollateralValue';

const Φ = BigNumber(
  '1.6180339887498948482045868343656381177203091798057628621354486227052604628189'
);

const validateArgsCdpId = id => !/^\d+$/.test(id) && 'Invalid cdp id: must be a positive integer';

const validateResultCdpCollateral = collateral =>
  collateral.gt(Φ) && 'Collateral amounts greater than Φ throw this error';

const validateResultCdpOwner = (owner, [id]) =>
  !owner && `Not found: cdp with id ${id} does not exist`;

export const tubRum = {
  generate: () => ({
    id: 'SAI_TUB.rum',
    contract: 'SAI_TUB',
    call: ['rum()(uint256)']
  }),
  returns: [[TOTAL_CDP_DEBT, fromWei]]
};

export const tubCupi = {
  generate: () => ({
    id: 'SAI_TUB.cupi',
    contract: 'SAI_TUB',
    call: ['cupi()(uint256)']
  }),
  returns: [[CDP_COUNT, parseInt]]
};

export const tubCups = {
  generate: id => ({
    id: `SAI_TUB.cups(${id})`,
    contract: 'SAI_TUB',
    call: ['cups(bytes32)(address,uint256,uint256,uint256)', numberToBytes32(id)]
  }),
  validate: {
    args: validateArgsCdpId,
    [CDP_OWNER]: validateResultCdpOwner,
    [CDP_COLLATERAL]: validateResultCdpCollateral
  },
  returns: [
    [CDP_OWNER, bytesToString],
    [CDP_COLLATERAL, fromWei],
    [CDP_DEBT, fromWei],
    [CDP_IRE, fromWei]
  ]
};

export const tubCap = {
  generate: () => ({
    id: 'SAI_TUB.cap',
    contract: 'SAI_TUB',
    call: ['cap()(uint256)']
  }),
  returns: [[DEBT_CEILING, fromWei]]
};

export const pipRead = {
  generate: () => ({
    id: 'SAI_PIP.read',
    contract: 'SAI_PIP',
    call: ['read()(uint256)']
  }),
  returns: [[ETH_PRICE, fromWei]]
};

export const cdpCollateralValue = {
  generate: id => ({
    dependencies: () => [[CDP_COLLATERAL, id], [ETH_PRICE]],
    computed: (cdpCollateral, ethPrice) => cdpCollateral.times(ethPrice)
  })
};

export const lastCreatedCdpCollateralValue = {
  generate: () => ({
    dependencies: () => [[CDP_COLLATERAL, [CDP_COUNT]], [ETH_PRICE]],
    computed: (cdpCollateral, ethPrice) => cdpCollateral.times(ethPrice)
  })
};

export default {
  tubRum,
  tubCups,
  tubCupi,
  tubCap,
  pipRead,
  cdpCollateralValue,
  lastCreatedCdpCollateralValue
};
