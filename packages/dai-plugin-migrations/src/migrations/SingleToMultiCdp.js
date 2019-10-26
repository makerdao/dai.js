import tracksTransactions from "@makerdao/dai-plugin-mcd/src/utils/tracksTransactions";

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
  async execute() {
    const migrateProxy = this._manager.get('smartContract').getContract('MIGRATION_PROXY_ACTIONS');
    const ids = await this.check();
    console.log(ids);
    console.log(migrateProxy);
  }
}
