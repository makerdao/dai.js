

export default class ChiefMigrate {
  constructor(manager) {
    this._manager = manager;
    this._oldChief = manager
      .get('smartContract')
      .getContract('OLD_CHIEF');
    return this;
  }
  //
  async check() {
    const address = this._manager.get('accounts').currentAddress();
    const balance = this._oldChief.deposits(address)
    return balance.toNumber() > 0;
  }

}
