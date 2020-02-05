import { fromWei, numberToBytes32 } from '../../src/utils/conversion';

export const TOTAL_CDP_DEBT = 'totalCdpDebt';
export const ETH_PRICE = 'ethPrice';
export const CDP_COLLATERAL = 'cdpCollateral';
export const CDP_DEBT = 'cdpDebt';
export const CDP_COUNT = 'cdpCount';
export const CDP_COLLATERAL_VALUE = 'cdpCollateralValue';
export const LAST_CREATED_CDP_COLLATERAL_VALUE = 'lastCreatedCdpCollateralValue'; // prettier-ignore

export const tubRum = {
  generate: () => ({
    id: 'SAI_TUB.rum',
    contractName: 'SAI_TUB',
    call: ['rum()(uint256)']
  }),
  returns: [[TOTAL_CDP_DEBT, fromWei]]
};

export const tubCupi = {
  generate: () => ({
    id: 'SAI_TUB.cupi',
    contractName: 'SAI_TUB',
    call: ['cupi()(uint256)']
  }),
  returns: [[CDP_COUNT, parseInt]]
};

export const tubInk = {
  generate: id => ({
    id: `SAI_TUB.ink(${id})`,
    contractName: 'SAI_TUB',
    call: ['ink(bytes32)(uint256)', numberToBytes32(id)]
  }),
  returns: [[CDP_COLLATERAL, fromWei]]
};

export const tubTab = {
  generate: id => ({
    id: `SAI_TUB.tab(${id})`,
    contractName: 'SAI_TUB',
    call: ['tab(bytes32)(uint256)', numberToBytes32(id)]
  }),
  returns: [[CDP_DEBT, fromWei]]
};

export const pipRead = {
  generate: () => ({
    id: 'SAI_PIP.read',
    contractName: 'SAI_PIP',
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
  tubInk,
  tubTab,
  tubCupi,
  pipRead,
  cdpCollateralValue,
  lastCreatedCdpCollateralValue
};
