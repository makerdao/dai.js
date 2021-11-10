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
      const txo = await this._contract[method](...[...args, { promise }]);
      this._parseLogs(txo.receipt.logs);
      return this;
    })();
    this.promise = promise;
    return promise;
  }

  _parseLogs(logs) {
    const [topic] = this._contract.interface.encodeFilterTopics(
      'LinkConfirmed',
      []
    );

    const [receiptEvent] = logs.filter(
      e => e.topics[0].toLowerCase() === topic.toLowerCase() //filter for LinkConfirmed events
    );

    const { args: eventArgs } = this._contract.interface.parseLog({
      data: receiptEvent.data,
      topics: receiptEvent.topics
    });

    this.proxyAddress = eventArgs['voteProxy'];
  }
}
