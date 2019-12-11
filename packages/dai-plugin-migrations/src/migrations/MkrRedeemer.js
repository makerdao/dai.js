export default class MkrRedeemer {
  constructor(manager) {
    this._manager = manager;
    return this;
  }

  async check() {
    const oldMkr = this._manager.get('token').getToken('OLD_MKR');
    return oldMkr.balance();
  }
}
