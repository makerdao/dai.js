import PublicService from '../core/PublicService';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';
import networks from '../../contracts/networks';
import { Contract } from 'ethers';

function wrapContract(contract, name, abi, txManager) {
  const nonConstantFns = {};

  for (let { type, constant, name } of abi) {
    if (type === 'function' && !constant) nonConstantFns[name] = true;
  }

  // The functions in ethers.Contract are set up as read-only, non-configurable
  // properties, which means if we try to change their values with Proxy, we
  // get an error. See https://stackoverflow.com/a/48495509/56817 for more
  // detail.
  //
  // But that only happens if the contract is specified as the first argument
  // to Proxy. So we don't do that. Go on, wag your finger.
  const proxy = new Proxy(
    {},
    {
      get(target, key) {
        if (nonConstantFns[key] && txManager) {
          return (...args) => {
            return txManager.formatHybridTx(contract, key, args, name);
          };
        }

        return contract[key];
      },

      set(target, key, value) {
        contract[key] = value;
        return true;
      }
    }
  );

  return proxy;
}

export default class SmartContractService extends PublicService {
  constructor(name = 'smartContract') {
    super(name, ['web3', 'log', 'transactionManager']);
  }

  initialize(settings = {}) {
    if (settings.addContracts) {
      this._addedContracts = Object.keys(settings.addContracts).reduce(
        (acc, key) => {
          const def = settings.addContracts[key];
          acc[key] = [{ ...def, version: 1 }];
          return acc;
        },
        {}
      );
    }
  }

  getContractByAddressAndAbi(address, abi, { name, hybrid = true } = {}) {
    if (!address) throw Error('Contract address is required');
    if (!name) name = this.lookupContractName(address);

    // this signer just delegates to the provider
    const signer = this.get('web3')
      .ethersProvider()
      .getSigner();
    const contract = new Contract(address, abi, signer);
    const txManager = hybrid ? this.get('transactionManager') : null;
    return wrapContract(contract, name, abi, txManager);
  }

  getContractByName(name, { version, hybrid = true } = {}) {
    const info = this._getContractInfo(name, version);
    return this.getContractByAddressAndAbi(info.address, info.abi, {
      name,
      hybrid
    });
  }

  lookupContractName(address) {
    address = address.toUpperCase();
    const contracts = this._getAllContractInfo();
    for (let name of Object.keys(contracts)) {
      const versions = contracts[name];
      if (versions.find(info => info.address.toUpperCase() === address)) {
        return name;
      }
    }

    return null;
  }

  getContractState(
    name,
    recursion = 0,
    beautify = true,
    exclude = ['tag', 'SAI_PEP.read'],
    visited = []
  ) {
    const info = this._getContractInfo(name),
      contract = this.getContractByAddressAndAbi(info.address, info.abi),
      inspectableMembers = info.abi
        .filter(m => m.constant && m.inputs.length < 1)
        .map(m => {
          const member = m.name;

          if (
            exclude.indexOf(member) > -1 ||
            exclude.indexOf(name + '.' + member) > -1
          ) {
            return {
              name: member,
              promise: Promise.resolve('[EXCLUDED]')
            };
          }

          return {
            name: member,
            promise: contract[m.name]().catch(
              reason => '[ERROR: ' + reason + ']'
            )
          };
        });

    visited = visited.concat([name]);

    return Promise.all(inspectableMembers.map(m => m.promise))
      .then(results => {
        const valuePromises = [];
        for (let i = 0; i < results.length; i++) {
          const key = inspectableMembers[i].name,
            value = results[i],
            contractName = this.lookupContractName(value.toString());

          if (
            contractName &&
            recursion > 0 &&
            visited.indexOf(contractName) < 0
          ) {
            valuePromises.push(
              this.getContractState(
                contractName,
                recursion - 1,
                beautify,
                exclude,
                visited
              ).then(childState => [key, childState])
            );
            visited = visited.concat([contractName]);
          } else if (contractName && visited.indexOf(contractName) > -1) {
            valuePromises.push([
              key,
              beautify ? value + '; ' + contractName + '; [VISITED]' : value
            ]);
          } else if (contractName) {
            valuePromises.push([
              key,
              beautify ? value + '; ' + contractName : value
            ]);
          } else {
            valuePromises.push([key, beautify ? value.toString() : value]);
          }
        }

        return Promise.all(valuePromises);
      })
      .then(values => {
        const result = { __self: contract.address + '; ' + name };
        values.forEach(v => (result[v[0]] = v.length > 2 ? v.slice(1) : v[1]));
        return result;
      });
  }

  hasContract(name) {
    return (
      Object.keys(contracts).indexOf(name) > -1 ||
      Object.keys(tokens).indexOf(name) > -1 ||
      Object.keys(this._addedContracts || {}).indexOf(name) > -1
    );
  }

  // generally we should be using the ethers contract interface. this is only
  // for edge cases that the ethers contract interface doesn't support, like
  // calling (but not sending) a non-constant function
  getWeb3ContractByName(name) {
    const { abi, address } = this._getContractInfo(name);
    return this.get('web3').web3Contract(abi, address);
  }

  _getContractInfo(name, version) {
    if (!this.hasContract(name)) {
      throw new Error('Provided name "' + name + '" is not a contract');
    }

    const contracts = this._getAllContractInfo();
    let versions = contracts[name];
    if (!version) version = Math.max(...versions.map(info => info.version));
    const contractInfo = versions.find(info => info.version === version);

    if (!contractInfo) {
      throw new Error(`Cannot find contract ${name}, version ${version}`);
    }

    return contractInfo;
  }

  _getAllContractInfo() {
    const id = this.get('web3').networkId(),
      mapping = networks.find(m => m.networkId === id);

    if (!mapping) throw new Error(`Network ID ${id} not found in mapping.`);
    const infos = mapping.addresses;
    if (this._addedContracts) {
      const infos2 = { ...infos, ...this._addedContracts };
      return infos2;
    }
    return infos;
  }
}
