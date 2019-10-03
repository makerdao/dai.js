export default class SDaiToMDai {
  constructor(manager) {
    this._manager = manager;
    return this;
  }

  async check() {
    const sai = this._manager.get('token').getToken('DAI');
    const balance = await sai.balance();
    return balance.gt(0);
  }
}
