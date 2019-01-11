import { getIlkForCurrency } from './utils';
import Maker from '@makerdao/dai';
import ethAbi from 'web3-eth-abi';

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

ManagedCdp.create = function(createTxo, collateralType, cdpManager) {
  const sig = ethAbi.encodeEventSignature('NewCdp(address,address,bytes12)');
  const log = createTxo.receipt.logs.find(l => l.topics[0] === sig);
  const id = parseInt(log.data.substring(2, 26), 16);
  return new ManagedCdp(id, collateralType, cdpManager);
};
