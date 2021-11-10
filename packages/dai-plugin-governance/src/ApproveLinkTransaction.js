export default class ApproveLinkTransaction {
  constructor(contract, transactionManager) {
    this._contract = contract;
    this._txMgr = transactionManager;
  }

  get fees() {
    return this._txMgr.getTransaction(this.promise).fees();
  }

  get timeStamp() {
    return this._txMgr.getTransaction(this.promise).timeStamp();
  }

  get timeStampSubmitted() {
    return this._txMgr.getTransaction(this.promise).timeStampSubmitted();
  }

  build(method, args) {
    const promise = (async () => {
      await 0;
      await this._contract[method](...[...args, { promise }]);
      await this._parseLogs();
      return this;
    })();
    this.promise = promise;
    return promise;
  }

  //_parseLogs(logs) {
  async _parseLogs() {
    // TODO if removing this method's "logs" argument causes problems (due to promise tracking),
    // try moving this logic higher in the call stack.
    const filter = this._contract.filters.LinkConfirmed();
    const [{ args: eventArgs }] = await this._contract.queryFilter(filter);

    this.proxyAddress = eventArgs['voteProxy'];
  }
}
