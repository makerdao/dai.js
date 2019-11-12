import tracksTransactions from '@makerdao/dai/dist/src/utils/tracksTransactions';
import { SAI } from '..';

export default class SaiToDai {
  constructor(manager) {
    this._manager = manager;
    this._sai = manager.get('token').getToken(SAI);
    return this;
  }

  async check() {
    return this._sai.balance();
  }

  @tracksTransactions
  async execute(amount, { promise }) {
    const formattedAmount = SAI(amount).toFixed('wei');
    const address = this._manager.get('web3').currentAddress();
    const migrationContract = this._manager
      .get('smartContract')
      .getContract('MIGRATION');
    const allowance = await this._sai.allowance(
      address,
      migrationContract.address
    );
    if (allowance.toNumber() < amount) {
      await this._sai.approve(migrationContract.address, formattedAmount, {
        promise
      });
    }

    return migrationContract.swapSaiToDai(formattedAmount, { promise });
  }
}
