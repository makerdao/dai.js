import PublicService from '../core/PublicService';
import Web3Service from './Web3Service';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';
import networks from '../../contracts/networks';
import { Contract } from 'ethers';
import '../polyfills';

export default class SmartContractService extends PublicService {
  static buildTestService(web3 = null) {
    const service = new SmartContractService();
    web3 = web3 || Web3Service.buildTestService();

    service
      .manager()
      .inject('log', web3.get('log'))
      .inject('web3', web3);

    //console.log('web3 is: ', web3);
    return service;
  }

  constructor(name = 'smartContract') {
    super(name, ['web3', 'log']);
  }

  getContractByAddressAndAbi(address, abi) {
    if (!address) {
      throw Error('Contract address is required');
    }

    return new Contract(
      address,
      abi,
      this.get('web3').ethersSigner()
    );
  }

  getContractByName(name, version = null) {
    const info = this._getContractInfo(name, version);
    return this.getContractByAddressAndAbi(info.address, info.abi);
  }

  lookupContractName(address) {
    address = address.toUpperCase();

    const mapping = this._getCurrentNetworkMapping()[0].addresses,
      names = Object.keys(mapping);

    for(let i=0; i<names.length; i++) {
      for(let j=0; j<mapping[names[i]].length; j++) {
        if (mapping[names[i]][j].address.toUpperCase() === address) {
          return names[i];
        }
      }
    }

    return null;
  }

  getContractState(name, version = null, exclude = ['tag'], recursion = 0, beautify = true) {
    const info = this._getContractInfo(name, version),
      contract = this.getContractByAddressAndAbi(info.address, info.abi),
      inspectableMembers = info.abi
        .filter(m => m.constant && m.inputs.length < 1 && exclude.indexOf(m.name) < 0)
        //.slice(0,10)
        .map(m => {
          //console.log('About to call ' + m.name + '();');
          return { name: m.name, promise: contract[m.name]() };
        });

    return Promise.all(inspectableMembers.map(m => m.promise))
      .then(results => {
        const valuePromises = [];
        for (let i=0; i<results.length; i++) {
          const key = inspectableMembers[i].name,
            value = results[i],
            contractName = this.lookupContractName(value.toString());

          if (contractName && recursion > 0) {
            valuePromises.push(this.getContractState(contractName, null, exclude, recursion - 1, beautify));
          } else if (contractName) {
            valuePromises.push([key, beautify ? value + '; ' + contractName : value]);
          } else {
            valuePromises.push([key, beautify ? value.toString() : value]);
          }
        }

        return Promise.all(valuePromises);
      })
      .then(values => {
        const result = {};
        values.forEach(v => result[v[0]] = v.length > 2 ? v.slice(1) : v[1]);
        return result;
      });
  }

  stringToBytes32(text) {
    const ethersUtils = this.get('web3').ethersUtils();
    var data = ethersUtils.toUtf8Bytes(text);
    if (data.length > 32) {
      throw new Error('too long');
    }
    data = ethersUtils.padZeros(data, 32);
    return ethersUtils.hexlify(data);
  }

  bytes32ToNumber(bytes32) {
    const ethersUtils = this.get('web3').ethersUtils();
    return ethersUtils.bigNumberify(bytes32).toNumber();
  }

  numberToBytes32(num) {
    const ethersUtils = this.get('web3').ethersUtils();
    return (
      '0x' +
      ethersUtils
        .bigNumberify(num)
        .toHexString()
        .substring(2)
        .padStart(64, '0')
    );
  }

  _getContractInfo(name, version = null) {
    if (
      Object.keys(contracts).indexOf(name) < 0 &&
      Object.keys(tokens).indexOf(name) < 0
    ) {
      throw new Error('Provided name "' + name + '" is not a contract');
    }

    const contractInfo = this._selectContractVersion(
      this._getCurrentNetworkMapping(name),
      version
    );

    if (contractInfo === null) {
      throw new Error(
        'Cannot find version ' + version + ' of contract ' + name
      );
    }

    return contractInfo;
  }

  _selectContractVersion(mapping, version) {
    if (version === null) {
      version = Math.max(...mapping.map(info => info.version));
    }

    let result = null;
    mapping.forEach(info => {
      if (info.version === version) {
        result = info;
      }
    });

    return result;
  }

  _getCurrentNetworkMapping(contractName = null) {
    const networkId = this.get('web3').networkId(),
      mapping = networks.filter(m => m.networkId === networkId);

    if (mapping.length < 1) {
      /* istanbul ignore next */
      throw new Error('Network ID ' + networkId + ' not found in mapping.');
    }

    if (!contractName) {
      return mapping;
    }

    if (typeof mapping[0].addresses[contractName] === 'undefined') {
      /* istanbul ignore next */
      throw new Error(
        'Contract ' +
          contractName +
          ' not found in mapping of network with ID ' +
          networkId
      );
    }

    return mapping[0].addresses[contractName];
  }
}
