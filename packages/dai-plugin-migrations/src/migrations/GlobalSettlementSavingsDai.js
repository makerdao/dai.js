export default class GlobalSettlementSavingsDai {
  constructor(container) {
    this._container = container;
    return this;
  }

  async check() {
    const smartContract = this._container.get('smartContract');
    const end = smartContract.getContract('MCD_END_1');
    const isInGlobalSettlement = !(await end.live());
    if (!isInGlobalSettlement) return false;

    const address =
      (await this._container.get('proxy').currentProxy()) ||
      this._container.get('accounts').currentAddress();

    const pot = smartContract.getContract('MCD_POT_1');
    const balance = await pot.pie(address);
    return balance.gt(0);
  }
}
