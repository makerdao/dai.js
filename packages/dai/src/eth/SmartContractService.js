import { PrivateService } from '@makerdao/services-core';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';
import networks, { contractAddressesInfo } from '../../contracts/networks';
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

    this._addressOverrides = settings.addressOverrides || {};

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
    return mapValues(
      this._getAllContractInfo(),
      versions => findLatestContractInfo(versions).address
    );
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
    const contractInfo = findContractInfoForVersion(contracts[name], version);
    assert(contractInfo, `Cannot find contract ${name}, version ${version}`);
    assert(contractInfo.address, `Contract ${name} has no address`);
    return contractInfo;
  }

  _getAllContractInfo() {
    let { networkName } = this.get('web3');
    const mapping = networks.find(m => m.name === networkName);
    assert(mapping, `Network "${networkName}" not found in mapping.`);

    if (!mapping.contracts)
      mapping.contracts = contractAddressesInfo(this._addressOverrides);

    if (!this._contractInfoCache) this._contractInfoCache = {};
    if (!this._contractInfoCache[networkName]) {
      const allContractInfo = this._addedContracts
        ? {
            ...mapping.contracts,
            ...this._addedContracts
          }
        : mapping.contracts;

      this._contractInfoCache[networkName] = mapValues(
        allContractInfo,
        (versions, name) => {
          const latest = findLatestContractInfo(versions);
          const address =
            getSingleAddress(this._addressOverrides[name], networkName) ||
            getSingleAddress(latest.address, networkName);
          return address !== latest.address
            ? versions.map(v => (v === latest ? { ...latest, address } : v))
            : versions;
        }
      );
    }

    return this._contractInfoCache[networkName];
  }
}

function findContractInfoForVersion(versions, version) {
  if (!version) version = Math.max(...versions.map(info => info.version));
  return versions.find(info => info.version === version);
}

function findLatestContractInfo(versions) {
  return findContractInfoForVersion(versions);
}

function getSingleAddress(addressGroup, networkName) {
  if (!addressGroup) return;

  if (typeof addressGroup === 'string') return addressGroup;

  if (addressGroup[networkName]) return addressGroup[networkName];

  // some configuration uses 'testnet' instead of 'test' as the network name
  if (networkName.startsWith('test') && addressGroup.testnet)
    return addressGroup.testnet;

  // return nothing if addressGroup has no address defined for this network
}
