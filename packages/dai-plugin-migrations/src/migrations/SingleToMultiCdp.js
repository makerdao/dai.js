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

    const migrationCdp = await vat.urns(
      stringToBytes('SAI'),
      migrationContractAddress
    );

    // for technical reasons, the liquidation ratio of the mcd migration cdp cannot be 0.
    // but, it will be close enough that the migration contract will
    // not be able to free only the last 1 wei of sai
    const migrationSaiLiquidity = SAI.wei(migrationCdp.ink);
    return migrationSaiLiquidity.eq(0)
      ? migrationSaiLiquidity
      : migrationSaiLiquidity.minus(SAI.wei(1));
  }
}
