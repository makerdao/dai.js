export default class VoteDelegate {
  constructor({ voteDelegateService, delegateAddress }) {
    this._voteDelegateService = voteDelegateService;
    this._delegateAddress = delegateAddress;
  }

  getDelegateAddress() {
    return this._delegateAddress;
  }
}

const passthroughMethods = [
  'lock',
  'free',
  'voteExec'
  // 'getNumDeposits',
  // 'getVotedProposalAddresses'
];

Object.assign(
  VoteDelegate.prototype,
  passthroughMethods.reduce((acc, name) => {
    acc[name] = function(...args) {
      return this._voteDelegateService[name](this._delegateAddress, ...args);
    };
    return acc;
  }, {})
);
