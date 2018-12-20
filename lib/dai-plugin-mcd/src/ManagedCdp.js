import { getIlkForCurrency } from './utils';

export default class ManagedCdp {
  constructor(id, collateralType, cdpManager, urn) {
    this.id = id;
    this.collateralType = collateralType;
    this._cdpManager = cdpManager;

    // this is the value of the `urn` argument to frob in frob.sol
    this.urn = urn;
  }

  async getLockedAmount() {
    const urnInfo = await this._cdpManager.vat.urns(
      getIlkForCurrency(this.collateralType),
      this.urn
    );
    return this.collateralType.wei(urnInfo.ink);
  }
}
