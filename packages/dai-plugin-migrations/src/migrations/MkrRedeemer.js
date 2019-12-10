export default class MkrRedeemer {
  constructor(manager) {
    this._manager = manager;
    return this;
  }

  // async check() {
  //   const balance = await this.oldMkrBalance();
  //   return balance.gt(0);
  // }

  async check() {
    const oldMkr = this._manager.get('token').getToken('OLD_MKR');
    return oldMkr.balance();
  }
}
