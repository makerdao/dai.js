import { toHex, fromWei, fromRay } from './utils';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
const LOGICAL = 'logical';
const DERIVED = 'derived';

const ENCUMBERED_COLLATERAL = 'encumberedCollateral';
const ENCUMBERED_DEBT = 'encumberedDebt';

const TOTAL_ENCUMBERED_DEBT = 'totalEncumberedDebt';
const DEBT_SCALING_FACTOR = 'debtScalingFactor';
const PRICE_WITH_SAFETY_MARGIN = 'priceWithSafetyMargin';
const DEBT_CEILING = 'debtCeiling';
const URN_DEBT_FLOOR = 'urndebtFloor';

const DAI_GENERATED = 'daiGenerated';

export const urn = (ilkName, urnAddress, vaultId) => ({
  type: LOGICAL,
  contractName: 'MCD_VAT',
  contractCall: 'urns(bytes32,address)(uint256,uint256)',
  callArgs: [[ilkName, toHex], [urnAddress]],
  callArgsOverrides: [vaultId],
  returnKeys: [['ink', fromWei], ['art', fromWei]],
  observableKeys: [
    [ENCUMBERED_COLLATERAL, `${vaultId}`],
    [ENCUMBERED_DEBT, `${vaultId}`]
  ]
});

export const ilk = ilkName => ({
  type: LOGICAL,
  contractName: 'MCD_VAT',
  contractCall: 'ilks(bytes32)(uint256,uint256,uint256,uint256,uint256)',
  callArgs: [[ilkName, toHex]],
  returnKeys: [['Art'], ['rate', fromRay], ['spot'], ['line'], ['dust']],
  observableKeys: [
    [TOTAL_ENCUMBERED_DEBT, ilkName],
    [DEBT_SCALING_FACTOR, ilkName],
    [PRICE_WITH_SAFETY_MARGIN, ilkName],
    [DEBT_CEILING, ilkName],
    [URN_DEBT_FLOOR, ilkName]
  ]
});

export const debt = (ilkName, vaultId) => ({
  type: DERIVED,
  observableKeys: [DAI_GENERATED, `${vaultId}`],
  dependencies: [
    [ENCUMBERED_DEBT, `${vaultId}`],
    [DEBT_SCALING_FACTOR, ilkName]
  ],
  fn: ([obs1$, obs2$]) =>
    combineLatest(obs1$, obs2$).pipe(map(([art, rate]) => art.times(rate)))
});

export default {
  urn,
  ilk,
  debt
};
