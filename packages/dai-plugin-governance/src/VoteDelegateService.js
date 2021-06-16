import { LocalService } from '@makerdao/services-core';
// import VoteProxy from './VoteProxy';
import { MKR, VOTE_PROXY_FACTORY /* ZERO_ADDRESS */ } from './utils/constants';
// maybe a "dai.js developer utils" package is useful?
import { getCurrency } from './utils/helpers';
import voteDelegateAbi from '../contracts/abis/VoteProxy.json';

export default class VoteProxyService extends LocalService {
  constructor(name = 'voteProxy') {
    super(name, ['smartContract', 'chief']);
  }

  // Writes -----------------------------------------------

  lock(delegateAddress, amt, unit = MKR) {
    const mkrAmt = getCurrency(amt, unit).toFixed('wei');
    return this._delegateContract(delegateAddress).lock(mkrAmt);
  }

  free(delegateAddress, amt, unit = MKR) {
    const mkrAmt = getCurrency(amt, unit).toFixed('wei');
    return this._proxyContract(delegateAddress).free(mkrAmt);
  }

  voteExec(delegateAddress, picks) {
    if (Array.isArray(picks))
      return this._delegateAddress(delegateAddress)['vote(address[])'](picks);
    return this._delegateAddress(delegateAddress)['vote(bytes32)'](picks);
  }

  // TODO: votePoll()

  // TODO: withdrawPoll()

  // Reads ------------------------------------------------

  // TODO: not sure if we need something similar yet
  // async getVotedProposalAddresses(proxyAddress) {
  //   const _slate = await this.get('chief').getVotedSlate(proxyAddress);
  //   return this.get('chief').getSlateAddresses(_slate);
  // }

  // TODO: similar read but for delegates
  // async getVoteProxy(addressToCheck) {
  //   const {
  //     hasProxy,
  //     role,
  //     address: proxyAddress
  //   } = await this._getProxyStatus(addressToCheck);
  //   if (!hasProxy) return { hasProxy, voteProxy: null };
  //   const otherRole = role === 'hot' ? 'cold' : 'hot';
  //   const otherAddress = await this._getAddressOfRole(proxyAddress, otherRole);
  //   return {
  //     hasProxy,
  //     voteProxy: new VoteProxy({
  //       voteProxyService: this,
  //       proxyAddress,
  //       [`${role}Address`]: addressToCheck,
  //       [`${otherRole}Address`]: otherAddress
  //     })
  //   };
  // }

  // Internal --------------------------------------------

  _delegateContract(address) {
    return this.get('smartContract').getContractByAddressAndAbi(
      address,
      voteDelegateAbi
    );
  }

  _delegateFactoryContract() {
    return this.get('smartContract').getContractByName(VOTE_PROXY_FACTORY);
  }

  // async _getProxyStatus(address) {
  //   const [proxyAddressCold, proxyAddressHot] = await Promise.all([
  //     this._proxyFactoryContract().coldMap(address),
  //     this._proxyFactoryContract().hotMap(address)
  //   ]);
  //   if (proxyAddressCold !== ZERO_ADDRESS)
  //     return { role: 'cold', address: proxyAddressCold, hasProxy: true };
  //   if (proxyAddressHot !== ZERO_ADDRESS)
  //     return { role: 'hot', address: proxyAddressHot, hasProxy: true };
  //   return { role: null, address: '', hasProxy: false };
  // }

  // _getAddressOfRole(proxyAddress, role) {
  //   if (role === 'hot') return this._proxyContract(proxyAddress).hot();
  //   else if (role === 'cold') return this._proxyContract(proxyAddress).cold();
  //   return null;
  // }
}

// add a few Chief Service methods to the Vote Proxy Service
// Object.assign(
//   VoteProxyService.prototype,
//   ['getVotedSlate', 'getNumDeposits'].reduce((acc, name) => {
//     acc[name] = function(...args) {
//       return this.get('chief')[name](...args);
//     };
//     return acc;
//   }, {})
// );
