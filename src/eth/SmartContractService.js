import { PrivateService } from '@makerdao/services-core';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';
import networks, { TESTNET_ID } from '../../contracts/networks';
import { Contract } from 'ethers';
import { wrapContract } from './smartContract/wrapContract';
import { mapValues } from 'lodash';
import assert from 'assert';

export default class SmartContractService extends PrivateService {
  constructor(name = 'smartContract') {
    super(name, ['web3', 'log', 'transactionManager']);

    // aliases
    this.getContract = this.getContractByName;
    this.getContractAddress = this.getContractAddressByName;
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
    this.get('transactionManager')
      .get('proxy')
      .setSmartContractService(this);
  }

  getContractByAddressAndAbi(address, abi, { name, wrap = true } = {}) {
    assert(address, `Missing address for contract "${name}"`);
    if (!name) name = this.lookupContractName(address);

    const web3Service = this.get('web3');
    const signerOrProvider = web3Service.get('accounts').hasAccount()
      ? web3Service.getEthersSigner()
      : web3Service.getEthersSigner().provider;

    const contract = new Contract(address, abi, signerOrProvider);
    const txManager = wrap && this.get('transactionManager');
    return wrapContract(contract, name, abi, txManager);
  }

  getContractAddressByName(name, { version } = {}) {
    const { address } = this._getContractInfo(name, version);
    return address;
  }

  getContractByName(name, { version, wrap = true } = {}) {
    const info = this._getContractInfo(name, version);
    return this.getContractByAddressAndAbi(info.address, info.abi, {
      name,
      wrap
    });
  }

  lookupContractName(address) {
    address = address.toUpperCase();
    const contracts = this._getAllContractInfo();
    for (let name of Object.keys(contracts)) {
      const versions = contracts[name];
      if (
        versions.find(
          info => info.address && info.address.toUpperCase() === address
        )
      ) {
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
    assert(this.hasContract(name), `No contract found for "${name}"`);
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
    const infos = mapping.contracts;
    if (this._addedContracts) {
      const networkName = {
        [TESTNET_ID]: 'testnet',
        [42]: 'kovan',
        [1]: 'mainnet'
      }[id];

      const infos2 = {
        ...infos,
        ...mapValues(this._addedContracts, ([definition], name) => {
          const { address, ...otherProps } = definition;
          if (typeof address === 'string') return [definition];
          if (!address || !address[networkName]) {
            console.log(`Missing address for ${name} on ${networkName}`);
            //throw new Error(`Missing address for ${name} on ${networkName}`);
          }
          return [{ address: address[networkName], ...otherProps }];
        })
      };
      return infos2;
    }
    return infos;
  }
}
