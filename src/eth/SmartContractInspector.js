import ContractWatcher from './inspector/ContractWatcher';
import PropertyWatcher from './inspector/PropertyWatcher';
import MethodWatcher from './inspector/MethodWatcher';

export default class SmartContractInspector {

  constructor(smartContractService) {
    this._service = smartContractService;
    this._watchers = { _contracts: [] };
  }

  inspect() {
    return this._callWatchers(Object.values(this._watchers._contracts));
  }

  watch(contract, expression = null) {
    contract = this._validContractName(contract);

    if (expression === null) {
      this._watchContract(contract);

    } else if (typeof expression === 'string' && expression.match(/^[_a-zA-Z][_a-zA-Z0-9]+$/)) {
      this._watchProperty(contract, expression);

    } else if (Array.isArray(expression) && expression.length > 0) {
      this._watchMethod(contract, expression[0], expression.slice(1));

    } else {
      throw new Error(`Illegal watch expression for ${contract}: '${expression.toString()}'`);
    }

    return this;
  }

  _callWatchers(watchers, map = {}, maxDepth = 5) {
    if (maxDepth < 1 || !Array.isArray(watchers) || watchers.length < 1) {
      return map;
    }

    const newWatchers = [];
    let result = Promise.resolve(map);
    
    watchers.forEach(w => {
      result = result
        .then(prevMap => w.run(prevMap, this._watchers))
        .then(runResult => {
          const [value, nextWatchers] = runResult;

          value.children = (nextWatchers || []).map(nw => nw.id());
          map[w.id()] = value || null;

          (nextWatchers || [])
            .filter(nw => typeof map[nw.id()] === 'undefined')
            .forEach(nw => newWatchers.push(nw));

          return map;
        });
    });

    return result.then(prevMap => this._callWatchers(newWatchers, prevMap, maxDepth - 1));
  }

  _watchContract(contractName) {
    this._watchers._contracts[contractName] = new ContractWatcher(contractName, this._service);
  }

  _watchProperty(contractName, propertyName) {
    if (!this._watchers[contractName]) {
      this._watchers[contractName] = {};
    }

    const watcher = new PropertyWatcher(contractName, propertyName, this._service);
    this._watchers[contractName][watcher.id()] = watcher;
  }

  _watchMethod(contractName, methodName, args) {
    if (!this._watchers[contractName]) {
      this._watchers[contractName] = {};
    }

    const watcher = new MethodWatcher(contractName, methodName, args, this._service);
    this._watchers[contractName][watcher.id()] = watcher;
  }

  _validContractName(name) {
    if (typeof name !== 'string') {
      throw new Error(`Expected contract name string, got '${typeof name}'`);
    }

    name = name.toUpperCase();

    if (!this._service.hasContract(name)) {
      throw new Error(`Cannot find contract: '${name}'`);
    }

    return name;
  }
}