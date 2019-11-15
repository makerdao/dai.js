import tracksTransactions from '@makerdao/dai/dist/src/utils/tracksTransactions';
import { DAI } from '..';

export default class DaiToSai {
  constructor(manager) {
    this._manager = manager;
    this._dai = manager.get('token').getToken(DAI);
    return this;
  }

  async check() {
    return this._dai.balance();
  }

  @tracksTransactions
  async execute(amount, { promise }) {
    const formattedAmount = DAI(amount).toFixed('wei');
    const address = this._manager.get('web3').currentAddress();
    const migrationContract = this._manager
      .get('smartContract')
      .getContract('MIGRATION');
    const allowance = await this._dai.allowance(
      address,
      migrationContract.address
    );
    if (allowance.toNumber() < amount) {
      await this._dai.approve(migrationContract.address, formattedAmount, {
        promise
      });
    }

    return migrationContract.swapDaiToSai(formattedAmount, { promise });
  }
}
