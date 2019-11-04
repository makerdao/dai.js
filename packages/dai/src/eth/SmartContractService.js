import { PrivateService } from '@makerdao/services-core';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';
import networks from '../../contracts/networks';
import { Contract } from 'ethers';
import { wrapContract } from './smartContract/wrapContract';
import mapValues from 'lodash/mapValues';
import assert from 'assert';

export default class SmartContractService extends PrivateService {
  constructor(name = 'smartContract') {
    super(name, ['web3', 'log', 'transactionManager']);

    // aliases
    this.getContractByName = this.getContract;
    this.getContractAddressByName = this.getContractAddress;
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

  getContractAddress(name, { version } = {}) {
    const { address } = this._getContractInfo(name, version);
    return address;
  }

  getContractAddresses() {
    return mapValues(this._getAllContractInfo(), versions => {
      const latest = Math.max(...versions.map(info => info.version));
      return versions.find(info => info.version === latest).address;
    });
  }

  getContract(name, { version, wrap = true } = {}) {
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
    assert(contractInfo, `Cannot find contract ${name}, version ${version}`);
    assert(contractInfo.address, `Contract ${name} has no address`);
    return contractInfo;
  }

  _getAllContractInfo() {
    let { networkName } = this.get('web3');
    const mapping = networks.find(m => m.name === networkName);

    assert(mapping, `Network "${networkName}" not found in mapping.`);
    if (!this._addedContracts) return mapping.contracts;

    if (!this._contractInfoCache) this._contractInfoCache = {};
    if (!this._contractInfoCache[networkName]) {
      this._contractInfoCache[networkName] = {
        ...mapping.contracts,
        ...mapValues(this._addedContracts, ([definition]) => {
          const { address, ...otherProps } = definition;
          if (typeof address === 'string') return [definition];
          return [
            { address: _findAddress(address, networkName), ...otherProps }
          ];
        })
      };
    }

    return this._contractInfoCache[networkName];
  }
}

function _findAddress(address, networkName) {
  if (typeof address === 'string') return address;
  if (networkName.startsWith('test')) return address.test || address.testnet;
  return address[networkName];
}
