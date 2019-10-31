export default class SDaiToMDai {
  constructor(manager) {
    this._manager = manager;
    return this;
  }

  async check() {
    const sai = this._manager.get('token').getToken('DAI');
    return sai.balance();
  }
}
