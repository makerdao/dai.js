export default class MethodNode {

  constructor(name, args, contract, id, value, isError = false) {
    this._name = name;
    this._args = args;
    this._contract = contract;
    this._id = id;
    this._rawValue = value;
    this._isError = isError;
  }

  getInfo() {
    return {
      type: 'method',
      contract: this._contract,
      name: this._name,
      args: this._args,
      value: this._rawValue.toString(),
      isError: this._isError
    };
  }
}