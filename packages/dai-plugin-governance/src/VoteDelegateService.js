import { LocalService } from '@makerdao/services-core';
import VoteDelegate from './VoteDelegate';
import { MKR, VOTE_DELEGATE_FACTORY, ZERO_ADDRESS } from './utils/constants';
import { getCurrency } from './utils/helpers';
import voteDelegateAbi from '../contracts/abis/VoteDelegate.json';

export default class VoteDelegateService extends LocalService {
  constructor(name = 'voteDelegate') {
    super(name, ['smartContract', 'chief']);
  }

  // Writes -----------------------------------------------

  lock(delegateAddress, amt, unit = MKR) {
    const mkrAmt = getCurrency(amt, unit).toFixed('wei');
    return this._delegateContract(delegateAddress).lock(mkrAmt);
  }

  free(delegateAddress, amt, unit = MKR) {
    const mkrAmt = getCurrency(amt, unit).toFixed('wei');
    return this._delegateContract(delegateAddress).free(mkrAmt);
  }

  voteExec(delegateAddress, picks) {
    if (Array.isArray(picks))
      return this._delegateAddress(delegateAddress)['vote(address[])'](picks);
    return this._delegateAddress(delegateAddress)['vote(bytes32)'](picks);
  }

  // TODO: votePoll()

  // TODO: withdrawPoll()

  // Reads ------------------------------------------------

  async getDelegateProxy(addressToCheck) {
    const {
      hasDelegate,
      address: delegateAddress
    } = await this._getDelegateStatus(addressToCheck);
    if (!hasDelegate) return { hasDelegate, voteDelegate: null };
    return {
      hasDelegate,
      voteProxy: new VoteDelegate({
        voteDelegateService: this,
        delegateAddress
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
    const delegateAddress = await this._delegateFactoryContract().delegates(
      address
    );

    if (delegateAddress !== ZERO_ADDRESS)
      return { address: delegateAddress, hasDelegate: true };

    return { address: '', hasDelegate: false };
  }
}
