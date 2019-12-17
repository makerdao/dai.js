export default class MkrRedeemer {
  constructor(manager) {
    this._manager = manager;
    return this;
  }

  check() {
    const address = this._manager.get('web3').currentAddress();
    const oldMkr = this._manager.get('token').getToken('OLD_MKR');
    return oldMkr.balanceOf(address);
  }
}
