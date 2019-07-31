import { MDAI_1 } from '../index';

export default class GlobalSettlementDaiRedeemer {
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

    const daiBalance = await this._manager
      .get('token')
      .getToken(MDAI_1)
      .balance();
    if (daiBalance.lte(0)) return false;

    const cdpManagerAddress = smartContract.getContractAddress('CDP_MANAGER_1');

    const [, , ilks] = await smartContract
      .getContract('GET_CDPS_1')
      .getCdpsDesc(cdpManagerAddress, proxyAddress);

    const uniqueIlks = [...new Set(ilks)];
    const fixes = await Promise.all(
      uniqueIlks.map(ilk => {
        return end.fix(ilk);
      })
    );

    return fixes.some(fix => fix.gt(0));
  }
}
