import tracksTransactions from '@makerdao/dai-plugin-mcd/src/utils/tracksTransactions';
import { stringToBytes } from '../utils';

export default class SingleToMultiCdp {
  constructor(manager) {
    this._manager = manager;
    return this;
  }

  async check() {
    const address = this._manager.get('accounts').currentAddress();
    const proxyAddress = await this._manager.get('proxy').currentProxy();
    const idsFromProxy = await this._manager.get('cdp').getCdpIds(proxyAddress);
    const idsFromAddress = await this._manager.get('cdp').getCdpIds(address);
    return idsFromProxy.length + idsFromAddress.length > 0
      ? idsFromProxy.concat(idsFromAddress)
      : [];
  }

  @tracksTransactions
  async execute(cupId, payment = 'MKR', maxPayAmount) {
    const migrationProxy = this._manager
      .get('smartContract')
      .getContract('MIGRATION_PROXY_ACTIONS');
    const migration = this._manager
      .get('smartContract')
      .getContract('MIGRATION');
    const defaultArgs = [migration.address, stringToBytes(cupId.toString())];
    const { method, args } = this._setMethodAndArgs(
      payment,
      defaultArgs,
      maxPayAmount
    );

    return migrationProxy[method](...args, { dsProxy: true });
  }

  _setMethodAndArgs(payment, defaultArgs, maxPayAmount) {
    const otc = this._manager.get('smartContract').getContract('MAKER_OTC')
      .address;

    if (payment === 'GEM') {
      const gem = this._manager
        .get('token')
        .getToken('WETH')
        .address();
      return {
        method: 'migratePayFeeWithGem',
        args: [...defaultArgs, otc, gem, maxPayAmount]
      };
    }

    if (payment === 'DEBT') {
      return {
        method: 'migratePayFeeWithDebt'
      };
    }

    return {
      method: 'migrate',
      args: defaultArgs
    };
  }
}
