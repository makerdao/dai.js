import tracksTransactions from "@makerdao/dai-plugin-mcd/src/utils/tracksTransactions";
import assert from 'assert';

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
    return idsFromProxy.length + idsFromAddress.length > 0
      ? idsFromProxy.concat(idsFromAddress)
      : [];
  }

  @tracksTransactions
  async execute(cupId, payment = 'MKR') {
    const migrationProxy = this._manager.get('smartContract').getContract('MIGRATION_PROXY_ACTIONS');
    const migration = this._manager.get('smartContract').getContract('MIGRATION');
    const id = this._stringToBytes(cupId.toString());
    const method = this._method(payment);

    return migrationProxy[method](migration.address, id);
  }

  _method(payment) {
    switch(payment) {
      case (payment === 'GEM'):
        return 'migratePayFeeWithGem';
      case(payment === 'DEBT'):
        return 'migratePayFeeWithDebt';
      default:
        return 'migrate';
    }
  }

  _stringToBytes(str) {
    assert(!!str, 'argument is falsy');
    assert(typeof str === 'string', 'argument is not a string');
    return '0x' + Buffer.from(str).toString('hex');
  }
}
