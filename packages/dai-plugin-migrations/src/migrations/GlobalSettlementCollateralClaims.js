import BigNumber from 'bignumber.js';
import { RAY } from '../constants';

export default class GlobalSettlementCollateralClaims {
  constructor(container) {
    this._container = container;
    return this;
  }

  async check() {
    const end = this._container.get('smartContract').getContract('MCD_END_1');
    const live = await end.live();
    const emergencyShutdownActive = live.eq(0);
    if (!emergencyShutdownActive) return false;
    const address = await this._container.get('proxy').currentProxy();
    if (!address) return false;
    const cdpManager = this._container
      .get('smartContract')
      .getContract('CDP_MANAGER_1');
    const vat = this._container.get('smartContract').getContract('MCD_VAT_1');

    const cdps = await this._container
      .get('smartContract')
      .getContract('GET_CDPS_1')
      .getCdpsDesc(cdpManager.address, address);

    const { ids, ilks } = cdps;
    const freeCollateral = await Promise.all(
      ids.map(async (id, i) => {
        const urn = await cdpManager.urns(id);
        const vatUrn = await vat.urns(ilks[i], urn);
        const tag = await end.tag(ilks[i]);
        const ilk = await vat.ilks(ilks[i]);

        const owed = new BigNumber(vatUrn.art)
          .times(ilk.rate)
          .div(RAY)
          .times(tag)
          .div(RAY);
        const redeemable =
          tag.gt(0) && new BigNumber(vatUrn.ink).minus(owed).gt(0);
        const tagDivRay = new BigNumber(tag).div(RAY);
        return { id, owed, redeemable, ilk, urn, tag: tagDivRay };
      })
    );
    if (!freeCollateral.some(v => v.redeemable)) return false;
    return freeCollateral;
  }

  _ilkToAdapter(ilk) {
    return 'MCD_JOIN_' + ilk.replace(/-/g, '_');
  }

  free(cdpId, ilk) {
    const cdpManagerAddress = this._container
      .get('smartContract')
      .getContractAddress('CDP_MANAGER_1');
    const endAddress = this._container
      .get('smartContract')
      .getContractAddress('MCD_END_1');
    const joinAddress = this._container
      .get('smartContract')
      .getContractAddress(this._ilkToAdapter(ilk));
    const methodName = ilk.substring(0, 3) === 'ETH' ? 'freeETH' : 'freeGem';
    return this._container
      .get('smartContract')
      .getContract('PROXY_ACTIONS_END')[methodName](
        cdpManagerAddress, joinAddress, endAddress, cdpId, {
        dsProxy: true
      });
  }
}
