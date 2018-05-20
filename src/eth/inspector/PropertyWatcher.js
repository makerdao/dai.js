export default class PropertyWatcher {

  constructor(contract, property, smartContractService) {
    this._contract = contract;
    this._property = property;
    this._service = smartContractService;
  }

  id() {
    return this._contract + '.' + this._property;
  }

  run() {
    return [];
  }
}