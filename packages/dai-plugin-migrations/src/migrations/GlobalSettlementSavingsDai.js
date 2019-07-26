export default class GlobalSettlementSavingsDai {
  constructor(manager) {
    this._manager = manager;
    return this;
  }

  async check() {
    const globalSettlement = this._manager.get('mcd:globalSettlement');
    const isInGlobalSettlement = await globalSettlement.isInProgress();
    if (!isInGlobalSettlement) return false;

    const address = this._manager.get('proxy').currentProxy();
    if (!address) return false;

    const savings = this._manager.get('mcd:savings');
    const balance = await savings.balance();
    return balance.gt(0);
  }
}
