import { SAI } from '..';

export default class SDaiToMDai {
  constructor(manager) {
    this._manager = manager;
    this._sai = manager.get('token').getToken(SAI);
    return this;
  }

  async check() {
    return this._sai.balance();
  }

  async execute(amount) {
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
      await this._sai.approve(migrationContract.address, formattedAmount);
    }

    return migrationContract.swapSaiToDai(formattedAmount);
  }
}
