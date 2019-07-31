export default class GlobalSettlementSavingsDai {
  constructor(manager) {
    this._manager = manager;
    return this;
  }

  async check() {
    const smartContract = this._manager.get('smartContract');
    const end = smartContract.getContract('MCD_END_1');
    const isInGlobalSettlement = !(await end.live());
    if (!isInGlobalSettlement) return false;

    const proxyAddress = await this._manager.get('proxy').currentProxy();
    if (!proxyAddress) return false;

    const pot = smartContract.getContract('MCD_POT_1');
    const balance = await pot.pie(proxyAddress);
    return balance.gt(0);
  }
}
