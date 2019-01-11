import { getIlkForCurrency } from './utils';
import Maker from '@makerdao/dai';

export default class ManagedCdp {
  constructor(id, collateralType, cdpManager) {
    this.id = id;
    this.collateralType = collateralType;
    this._cdpManager = cdpManager;
  }

  async getCollateralValue(collateralType = this.collateralType) {
    return collateralType.wei((await this._getUrn(collateralType)).ink);
  }

  async getDebtValue(collateralType = this.collateralType) {
    return Maker.DAI.wei((await this._getUrn(collateralType)).art);
  }

  async _getUrn(collateralType) {
    return this._cdpManager.vat.urns(
      getIlkForCurrency(collateralType),
      this._cdpManager.getUrn(this.id)
    );
  }
}
