import PropertyNode from "./PropertyNode";

export default class PropertyWatcher {

  constructor(contract, property, smartContractService, parentContract = null) {
    this._contract = contract;
    this._property = property;
    this._service = smartContractService;
    this._parentContract = parentContract;
  }

  id() {
    return this._contract + '.' + this._property;
  }

  run() {
    const parentContract = this._getParentContract();
    return parentContract[this._property]()
      .then(value => [new PropertyNode(this._property, this._contract, this.id(), value)]);
  }

  _getParentContract() {
    return this._parentContract || this._service.getContractByName(this._contract);
  }
}