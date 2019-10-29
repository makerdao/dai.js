import { stringToBytes } from '../utils';
import { SAI } from '../index';

export default class SingleToMultiCdp {
  constructor(manager) {
    this._manager = manager;
    return this;
  }

  async check() {
    const address = this._manager.get('accounts').currentAddress();
    const proxyAddress = await this._manager.get('proxy').currentProxy();
    const idsFromProxy = await this._manager.get('cdp').getCdpIds(proxyAddress);
    const idsFromAddress = await this._manager.get('cdp').getCdpIds(address);
    return idsFromProxy.length + idsFromAddress.length > 0;
  }

  async migrationSaiAvailable() {
    const vat = this._manager.get('smartContract').getContract('MCD_VAT_1');
    const migrationContractAddress = this._manager
      .get('smartContract')
      .getContract('MIGRATION').address;

    // should the sai cdp name be passed in via configuration?
    const migrationCdp = await vat.urns(
      stringToBytes('SAI'),
      migrationContractAddress
    );

    return SAI.wei(migrationCdp.ink);
  }
}
