export default class VoteProxy {
  constructor({ voteProxyService, proxyAddress, coldAddress, hotAddress }) {
    this._voteProxyService = voteProxyService;
    this._proxyAddress = proxyAddress;
    this._coldAddress = coldAddress;
    this._hotAddress = hotAddress;
  }

  getProxyAddress() {
    return this._proxyAddress;
  }

  getColdAddress() {
    return this._coldAddress;
  }

  getHotAddress() {
    return this._hotAddress;
  }
}

const passthroughMethods = [
  'lock',
  'free',
  'voteExec',
  'getNumDeposits',
  'getVotedProposalAddresses'
];

Object.assign(
  VoteProxy.prototype,
  passthroughMethods.reduce((acc, name) => {
    acc[name] = function(...args) {
      return this._voteProxyService[name](this._proxyAddress, ...args);
    };
    return acc;
  }, {})
);
