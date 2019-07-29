export default class GlobalSettlementCollateralClaims {
  constructor(manager) {
    this._manager = manager;
    return this;
  }

  async check() {
    const globalSettlement = this._manager
      .get('smartContract')
      .getContract('MCD_END_1');
    const isInGlobalSettlement = !(await globalSettlement.live());
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

    const urns = await Promise.all(
      ids.map(async (id, i) => {
        const urn = await cdpManager.urns(id);
        return await vat.urns(ilks[i], urn);
      })
    );

    const hasUrnWithInkAndNoArt = urns.some(urn => {
      return urn.ink.gt(0) && urn.art.eq(0);
    });

    return hasUrnWithInkAndNoArt;
  }
}
