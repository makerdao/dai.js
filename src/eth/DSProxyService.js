import PrivateService from '../core/PrivateService';
import TransactionObject from './TransactionObject';
import { Contract } from 'ethers';
import { dappHub } from '../../contracts/abis';
import { contractInfo } from '../../contracts/networks';

export default class DSProxyService extends PrivateService {
  constructor(name = 'proxy') {
    super(name, ['web3', 'nonce']);
  }

  async authenticate() {
    this._currentProxy = await this.getProxyAddress();
  }

  _proxyRegistry() {
    return new Contract(
      this._registryInfo().address,
      this._registryInfo().abi,
      this.get('web3').getEthersSigner()
    );
  }

  _registryInfo() {
    return contractInfo(this._network()).PROXY_REGISTRY[0];
  }

  _network() {
    switch (this.get('web3').networkId()) {
      case 1:
        return 'mainnet';
      case 42:
        return 'kovan';
      case 999:
        return 'test';
    }
  }

  _resetDefaults(newProxy) {
    this._currentProxy = newProxy;
    this._currentAddress = this.get('web3').currentAddress();
  }

  currentProxy() {
    return this._currentAddress === this.get('web3').currentAddress()
      ? this._currentProxy
      : this.getProxyAddress();
  }

  async requireProxy() {
    if (!this._currentProxy) {
      await this.build();
    }
    return await this.currentProxy();
  }

  async build() {
    if (await this.currentProxy()) {
      throw new Error(
        'This account already has a proxy deployed at ' + this.currentProxy()
      );
    }
    const nonce = await this.get('nonce').getNonce();
    const txo = await new TransactionObject(
      this._proxyRegistry().build({
        ...this.get('web3').transactionSettings(),
        nonce: nonce
      }),
      this.get('web3'),
      this.get('nonce'),
      { contract: 'PROXY_REGISTRY', method: 'build' }
    ).mine();
    this._currentProxy = await this.getProxyAddress();
    this.get('web3')
      .get('event')
      .emit('dsproxy/BUILD', {
        address: this._currentProxy
      });
    return txo;
  }

  execute(contract, method, args, options, address) {
    if (!address && typeof this._currentProxy !== 'string') {
      throw new Error('No proxy found for current account');
    }
    const proxyAddress = address ? address : this.currentProxy();
    const proxyContract = this._getContractByProxyAddress(proxyAddress);
    const data = contract.interface.functions[method](...args).data;
    return proxyContract.execute(contract.address, data, options);
  }

  async getProxyAddress(providedAddress = false) {
    const address = providedAddress
      ? providedAddress
      : this.get('web3').currentAddress();

    let proxyAddress = await this._proxyRegistry().proxies(address);
    if (proxyAddress === '0x0000000000000000000000000000000000000000') {
      proxyAddress = null;
    }

    if (!providedAddress) this._resetDefaults(proxyAddress);
    return proxyAddress;
  }

  _getContractByProxyAddress(address) {
    return new Contract(
      address,
      dappHub.dsProxy,
      this.get('web3').getEthersSigner()
    );
  }

  async getOwner(address) {
    const contract = this._getContractByProxyAddress(address);
    return await contract.owner();
  }

  async setOwner(newOwner, proxyAddress = this._currentProxy) {
    const nonce = await this.get('nonce').getNonce();
    const contract = this._getContractByProxyAddress(proxyAddress);
    return await new TransactionObject(
      contract.setOwner(newOwner, {
        ...this.get('web3').transactionSettings(),
        nonce: nonce
      }),
      this.get('web3'),
      this.get('nonce'),
      { contract: 'PROXY_REGISTRY', method: 'setOwner' }
    ).mine();
  }
}
