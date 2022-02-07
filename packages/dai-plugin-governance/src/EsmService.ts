import { PrivateService } from '@makerdao/services-core';
import { MKR, ESM, END } from './utils/constants';
import { getCurrency } from './utils/helpers';
import { tracksTransactionsWithOptions } from './utils/tracksTransactions';

export default class EsmService extends PrivateService {
  constructor(name = 'esm') {
    super(name, ['smartContract', 'web3', 'token', 'allowance', 'govQueryApi']);
  }

  async thresholdAmount() {
    const min = await this._esmContract().min();
    return getCurrency(min, MKR).shiftedBy(-18);
  }

  async emergencyShutdownActive() {
    const active = await this._endContract().live();
    return active.eq(0);
  }

  async canFire() {
    const shutdown = await this.emergencyShutdownActive();
    return !shutdown;
  }

  async getTotalStaked() {
    const total = await this._esmContract().Sum();
    return getCurrency(total, MKR).shiftedBy(-18);
  }

  async getTotalStakedByAddress(address = false) {
    if (!address) {
      address = this.get('web3').currentAddress();
    }
    const total = await this._esmContract().sum(address);
    return getCurrency(total, MKR).shiftedBy(-18);
  }

  @tracksTransactionsWithOptions({ numArguments: 3 })
  async stake(amount, skipChecks = false, { promise }) {
    const mkrAmount = getCurrency(amount, MKR);
    if (!skipChecks) {
      const mkrBalance = await this.get('token')
        .getToken(MKR)
        .balance();
      if (mkrBalance.lt(mkrAmount)) {
        throw new Error('amount to join is greater than the user balance');
      }
    }
    return this._esmContract().join(mkrAmount.toFixed('wei'), { promise });
  }

  @tracksTransactionsWithOptions({ numArguments: 2 })
  async triggerEmergencyShutdown(skipChecks = false) {
    if (!skipChecks) {
      const [thresholdAmount, totalStaked, canFire] = await Promise.all([
        this.thresholdAmount(),
        this.getTotalStaked(),
        this.canFire()
      ]);
      if (totalStaked.lt(thresholdAmount)) {
        throw new Error(
          'total amount of staked MKR has not reached the required threshold'
        );
      }
      if (!canFire) {
        throw new Error('emergency shutdown has already been initiated');
      }
    }
    return this._esmContract().fire();
  }

  async getStakingHistory() {
    const stakes = await this.get('govQueryApi').getEsmJoins();
    const parsedStakes = stakes.map(e => {
      const transactionHash = e.txHash;
      const senderAddress = e.txFrom;
      const amount = MKR(e.joinAmount);
      const time = new Date(e.blockTimestamp);
      return {
        transactionHash,
        senderAddress,
        amount,
        time
      };
    });
    const sortedParsedStakes = parsedStakes.sort((a, b) => {
      //sort by date descending
      return b.time - a.time;
    });
    return sortedParsedStakes;
  }

  async getStakingV2History() {
    const stakes = await this.get('govQueryApi').getEsmV2Joins();
    const parsedStakes = stakes.map(e => {
      const transactionHash = e.txHash;
      const senderAddress = e.txFrom;
      const amount = MKR(e.joinAmount);
      const time = new Date(e.blockTimestamp);
      return {
        transactionHash,
        senderAddress,
        amount,
        time
      };
    });
    const sortedParsedStakes = parsedStakes.sort((a, b) => {
      //sort by date descending
      return b.time - a.time;
    });
    return sortedParsedStakes;
  }

  _esmContract() {
    return this.get('smartContract').getContractByName(ESM);
  }

  _endContract() {
    return this.get('smartContract').getContractByName(END);
  }
}
