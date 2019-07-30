import BigNumber from 'bignumber.js';
import { RAY } from '../constants';

export default class GlobalSettlementCollateralClaims {
  constructor(manager) {
    this._manager = manager;
    return this;
  }

  async check() {
    const end = this._manager.get('smartContract').getContract('MCD_END_1');
    const isInGlobalSettlement = !(await end.live());
    if (!isInGlobalSettlement) return false;

    const address = await this._manager.get('proxy').currentProxy();
    if (!address) return false;

    const cdpManager = this._manager
      .get('smartContract')
      .getContract('CDP_MANAGER_1');
    const vat = this._manager.get('smartContract').getContract('MCD_VAT_1');

    const [ids, , ilks] = await this._manager
      .get('smartContract')
      .getContract('GET_CDPS_1')
      .getCdpsDesc(cdpManager.address, address);

    const freeCollateral = await Promise.all(
      ids.map(async (id, i) => {
        const urn = await cdpManager.urns(id);
        const vatUrn = await vat.urns(ilks[i], urn);
        const tag = await end.tags(ilks[i]);
        const ilk = await vat.ilks(ilks[i]);

        const owed = new BigNumber(vatUrn.art)
          .times(ilk.rate)
          .div(RAY)
          .times(tag)
          .div(RAY);

        return tag.gt(0) && new BigNumber(vatUrn.ink).minus(owed).gt(0);
      })
    );

    return freeCollateral.some(exists => exists);
  }
}
