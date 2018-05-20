import ContractNode from "./ContractNode";
import PropertyWatcher from "./PropertyWatcher";

export default class ContractWatcher {

  constructor(contract, smartContractService) {
    this._contract = contract;
    this._service = smartContractService;
  }

  id() {
    return this._contract;
  }

  run(map, watchers) {
    const info = this._service._getContractInfo(this._contract),
      contract = this._service.getContractByAddressAndAbi(info.address, info.abi, this._contract),

      node = new ContractNode(
        this._contract,
        contract.getAddress().toUpperCase(),
        contract.getSigner().address.toUpperCase()),

      allWatchers = Object.values(watchers[this._contract] || [])
        .concat(this._getPropertyWatchers(info.abi));

    return [node, allWatchers];
  }

  _getPropertyWatchers(abi) {
    return abi
      .filter(m => m.constant && m.inputs.length < 1)
      .map(m => new PropertyWatcher(this._contract, m.name, this._service));
  }
}