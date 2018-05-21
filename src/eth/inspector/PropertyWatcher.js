import PropertyNode from './PropertyNode';
import ContractWatcher from './ContractWatcher';

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
    try {
      const parentContract = this._getParentContract();
      return parentContract[this._property]()
        .then(value => [
          new PropertyNode(this._property, this._contract, this.id(), value),
          this._getWatchersForValue(value)
        ])
        .catch(reason => [
          new PropertyNode(this._property, this._contract, this.id(), reason, true),
          []
        ]);

    } catch(error) {
      return Promise.resolve([
        new PropertyNode(this._property, this._contract, this.id(), error, true),
        []
      ]);
    }
  }

  _getParentContract() {
    return this._parentContract || this._service.getContractByName(this._contract);
  }

  _getWatchersForValue(value) {
    const result = [];

    if (
      typeof value === 'string' &&
      value.length > 2 &&
      value.substr(0, 2).toLowerCase() === '0x'
    ) {
      const name = this._service.lookupContractName(value);
      if (name !== null) {
        result.push(new ContractWatcher(name, this._service));
      }
    }

    return result;
  }
}