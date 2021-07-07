import { LocalService } from '@makerdao/services-core';
import { VOTE_DELEGATE_FACTORY } from './utils/constants';
import tracksTransactions from './utils/tracksTransactions';

export default class VoteDelegateFactoryService extends LocalService {
  constructor(name = 'voteDelegateFactory') {
    super(name, ['smartContract', 'voteDelegate', 'transactionManager']);
  }

  // writes
  @tracksTransactions
  createDelegateContract({ promise }) {
    return this._delegateFactoryContract().create({ promise });
  }

  // reads
  getVoteDelegate(owner) {
    return this.get('voteDelegate').getVoteDelegate(owner);
  }

  _delegateFactoryContract() {
    return this.get('smartContract').getContractByName(VOTE_DELEGATE_FACTORY);
  }
}
