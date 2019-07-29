export default class GlobalSettlementSavingsDai {
  constructor(manager) {
    this._manager = manager;
    return this;
  }

  async check() {
    const globalSettlement = this._manager
      .get('smartContract')
      .getContract('MCD_END_1');
    const isInGlobalSettlement = !(await globalSettlement.live());
    if (!isInGlobalSettlement) return false;

    const address = await this._manager.get('proxy').currentProxy();
    if (!address) return false;

    const savings = this._manager.get('mcd:savings');
    const balance = await savings.balance();
    return balance.gt(0);
  }
}
