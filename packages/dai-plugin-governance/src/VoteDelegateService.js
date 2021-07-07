import { LocalService } from '@makerdao/services-core';
import VoteDelegate from './VoteDelegate';
import { MKR, VOTE_DELEGATE_FACTORY, ZERO_ADDRESS } from './utils/constants';
import { getCurrency } from './utils/helpers';
import voteDelegateAbi from '../contracts/abis/VoteDelegate.json';
import { tracksTransactionsWithOptions } from './utils/tracksTransactions';

export default class VoteDelegateService extends LocalService {
  constructor(name = 'voteDelegate') {
    super(name, ['smartContract', 'govQueryApi', 'chief']);
  }

  // writes -----------------------------------------------

  @tracksTransactionsWithOptions({ numArguments: 4 })
  lock(delegateAddress, amt, unit = MKR, { promise }) {
    const mkrAmt = getCurrency(amt, unit).toFixed('wei');
    return this._delegateContract(delegateAddress).lock(mkrAmt, { promise });
  }

  @tracksTransactionsWithOptions({ numArguments: 4 })
  free(delegateAddress, amt, unit = MKR, { promise }) {
    const mkrAmt = getCurrency(amt, unit).toFixed('wei');
    return this._delegateContract(delegateAddress).free(mkrAmt), { promise };
  }

  voteExec(delegateAddress, picks) {
    if (Array.isArray(picks))
      return this._delegateContract(delegateAddress)['vote(address[])'](picks);
    return this._delegateContract(delegateAddress)['vote(bytes32)'](picks);
  }

  votePoll(pollIds, optionIds) {
    if (pollIds.length !== optionIds.length || pollIds.length === 0)
      throw new Error(
        'poll id array and option id array must be the same length and have a non-zero number of elements'
      );
  }

  // TODO: withdrawPoll()

  // reads ------------------------------------------------

  async getStakedBalanceForAddress(delegateAddress, address) {
    return await this._getStakedBalanceForAddress(delegateAddress, address);
  }

  async getAllDelegates() {
    return await this.get('govQueryApi').getAllDelegates();
  }

  async getVoteDelegate(addressToCheck) {
    const {
      hasDelegate,
      address: voteDelegateAddress
    } = await this._getDelegateStatus(addressToCheck);
    if (!hasDelegate) return { hasDelegate, voteDelegate: null };
    return {
      hasDelegate,
      voteDelegate: new VoteDelegate({
        voteDelegateService: this,
        voteDelegateAddress
      })
    };
  }

  // Internal --------------------------------------------

  _delegateContract(address) {
    return this.get('smartContract').getContractByAddressAndAbi(
      address,
      voteDelegateAbi
    );
  }

  _delegateFactoryContract() {
    return this.get('smartContract').getContractByName(VOTE_DELEGATE_FACTORY);
  }

  async _getDelegateStatus(address) {
    const voteDelegateAddress = await this._delegateFactoryContract().delegates(
      address
    );

    if (voteDelegateAddress !== ZERO_ADDRESS)
      return { address: voteDelegateAddress, hasDelegate: true };

    return { address: '', hasDelegate: false };
  }

  async _getStakedBalanceForAddress(delegateAddress, address) {
    return await this._delegateContract(delegateAddress).stake(address);
  }
}
