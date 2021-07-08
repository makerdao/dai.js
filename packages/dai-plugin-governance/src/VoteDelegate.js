export default class VoteDelegate {
  constructor({ voteDelegateService, voteDelegateAddress }) {
    this._voteDelegateService = voteDelegateService;
    this._voteDelegateAddress = voteDelegateAddress;
  }

  getVoteDelegateAddress() {
    return this._voteDelegateAddress;
  }
}

const passthroughMethods = ['lock', 'free', 'voteExec', 'votePoll'];

Object.assign(
  VoteDelegate.prototype,
  passthroughMethods.reduce((acc, name) => {
    acc[name] = function(...args) {
      return this._voteDelegateService[name](
        this._voteDelegateAddress,
        ...args
      );
    };
    return acc;
  }, {})
);
