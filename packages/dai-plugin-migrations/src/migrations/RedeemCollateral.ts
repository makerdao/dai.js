export default class RedeemCollateral {
  _manager;

  constructor(manager) {
    this._manager = manager;
    return this;
  }

  _contract(name) {
    return this._manager.get('smartContract').getContract(name);
  }

  cooldown() {
    return this._contract('SAI_TOP').cooldown();
  }

  async pethInTap() {
    const fog = await this._contract('SAI_TAP').fog();
    return fog / Math.pow(10, 18);
  }

  redeemCollateral(cdp, wad) {
    // This will be replaced with the new contract method
    // that atomically exits/unwraps
    return cdp.freePeth(wad);
  }
}
