import { tracksTransactionsWithOptions } from '@makerdao/dai/dist/src/utils/tracksTransactions';
import { getIdBytes } from '../utils';
import { SAI, MKR } from '..';

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
      ? { [proxyAddress]: idsFromProxy, [address]: idsFromAddress }
      : {};
  }

  @tracksTransactionsWithOptions({ numArguments: 4 })
  async execute(cupId, payment = 'MKR', maxPayAmount, { promise }) {
    const migrationProxy = this._manager
      .get('smartContract')
      .getContract('MIGRATION_PROXY_ACTIONS');
    const migration = this._manager
      .get('smartContract')
      .getContract('MIGRATION');
    const defaultArgs = [migration.address, getIdBytes(cupId)];
    const { method, args } = this._setMethodAndArgs(
      payment,
      defaultArgs,
      maxPayAmount
    );

    await this._requireAllowance(cupId);
    return migrationProxy[method](...args, { dsProxy: true, promise }).then(
      txo => this._manager.get('mcd:cdpManager').getNewCdpId(txo)
    );
  }

  async _requireAllowance(cupId) {
    // This will need to be updated to work with sai too
    const address = this._manager.get('web3').currentAddress();
    const proxyAddress = await this._manager.get('proxy').currentProxy();
    const cdp = await this._manager.get('cdp').getCdp(cupId);
    const fee = await cdp.getGovernanceFee();
    const mkr = this._getToken(MKR);
    const allowance = await mkr.allowance(address, proxyAddress);

    // add a buffer amount to allowance in case drip hasn't been called recently
    if (allowance.lt(fee)) await mkr.approve(proxyAddress, fee.times(1.5));
  }

  // eslint-disable-next-line
  _setMethodAndArgs(payment, defaultArgs, maxPayAmount) {
    // eslint-disable-next-line
    const otc = this._manager.get('smartContract').getContract('MAKER_OTC')
      .address;

    // to do:
    // if (payment === 'GEM') {
    //   const gem = this._manager
    //     .get('token')
    //     .getToken('DAI')
    //     .address();
    //   return {
    //     method: 'migratePayFeeWithGem',
    //     args: [...defaultArgs, otc, gem, SAI(maxPayAmount).toFixed('wei')]
    //   };
    // }

    if (payment === 'DEBT') {
      // add min ratio
      return {
        method: 'migratePayFeeWithDebt',
        args: [...defaultArgs, otc, SAI(maxPayAmount).toFixed('wei'), SAI(150).toFixed('wei')]
      };
    }

    return {
      method: 'migrate',
      args: defaultArgs
    };
  }

  async migrationSaiAvailable() {
    const vat = this._manager.get('smartContract').getContract('MCD_VAT_1');
    const migrationContractAddress = this._manager
      .get('smartContract')
      .getContract('MIGRATION').address;

    const migrationCdp = await vat.urns(
      stringToBytes('SAI'),
      migrationContractAddress
    );

    // for technical reasons, the liquidation ratio of the mcd migration cdp cannot be 0.
    // but, it will be close enough that the migration contract will
    // not be able to free only the last 1 wei of sai
    const migrationSaiLiquidity = SAI.wei(migrationCdp.ink);
    return migrationSaiLiquidity.eq(0)
      ? migrationSaiLiquidity
      : migrationSaiLiquidity.minus(SAI.wei(1));
  }

  _getToken(symbol) {
    return this._manager.get('token').getToken(symbol);
  }
}
