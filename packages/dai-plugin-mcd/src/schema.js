import { toHex } from './utils';

const ENCUMBERED_COLLATERAL = 'encumberedCollateral';
const ENCUMBERED_DEBT = 'encumberedDebt';

const TOTAL_ENCUMBERED_DEBT = 'totalEncumberedDebt';
const DEBT_SCALING_FACTOR = 'debtScalingFactor';
const PRICE_WITH_SAFETY_MARGIN = 'priceWithSafetyMargin';
const DEBT_CEILING = 'debtCeiling';
const URN_DEBT_FLOOR = 'urndebtFloor';

const DAI_GENERATED = 'daiGenerated';

export const urn = (ilkName, urnAddress, vaultId) => ({
  contractName: 'MCD_VAT',
  contractCall: 'urns(bytes32,address)(uint256,uint256)',
  callArgs: [[ilkName, toHex], [urnAddress]],
  callArgsOverrides: [vaultId],
  returnKeys: [['ink'], ['art']],
  observableKeys: [
    [ENCUMBERED_COLLATERAL, `${vaultId}`],
    [ENCUMBERED_DEBT, `${vaultId}`]
  ]
});

export const ilk = ilkName => ({
  contractName: 'MCD_VAT',
  contractCall: 'ilks(bytes32)(uint256,uint256,uint256,uint256,uint256)',
  callArgs: [[ilkName, toHex]],
  returnKeys: [['Art'], ['rate'], ['spot'], ['line'], ['dust']],
  observableKeys: [
    [TOTAL_ENCUMBERED_DEBT, ilkName],
    [DEBT_SCALING_FACTOR, ilkName],
    [PRICE_WITH_SAFETY_MARGIN, ilkName],
    [DEBT_CEILING, ilkName],
    [URN_DEBT_FLOOR, ilkName]
  ]
});

export const derivedSchema = [];

export default {
  urn,
  ilk
};
