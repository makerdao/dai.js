export default class MethodWatcher {

  constructor(contract, method, args, smartContractService) {
    this._contract = contract;
    this._method = method;
    this._args = args;
    this._service = smartContractService;
  }

  id() {
    return `${this._contract}.${this._method}(${this._args.join(',')})`;
  }

  run() {
    return [];
  }
}