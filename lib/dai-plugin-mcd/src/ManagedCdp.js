export default class ManagedCdp {
  constructor(id, collateralType, cdpManager, urn) {
    this.id = id;
    this.collateralType = collateralType;
    this._cdpManager = cdpManager;
    this.urn = urn;
  }

  async getLockedAmount() {
    console.log(
      this._cdpManager.ilk(this.collateralType),
      this.urn
    );
    const urn = await this._cdpManager.vat.urns(
      this._cdpManager.ilk(this.collateralType),
      this.urn
    );
    return this.collateralType.wei(urn.ink);
  }
}
