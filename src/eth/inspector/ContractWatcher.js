export default class ContractWatcher {

  constructor(contract, smartContractService) {
    this._contract = contract;
    this._service = smartContractService;
  }

  id() {
    return this._contract;
  }

  run(prevMap, watchers) {
    return [{}, Object.values(watchers[this._contract])];
  }
}