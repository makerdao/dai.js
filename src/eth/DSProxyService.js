import PrivateService from '../core/PrivateService';
import { Contract } from 'ethers';
import { dappHub } from '../../contracts/abis';
import { contractInfo } from '../../contracts/networks';

export default class DSProxyService extends PrivateService {
  constructor(name = 'proxy') {
    super(name, ['web3']);
  }

  async authenticate() {
    this._currentProxy = await this.getProxyAddress();
  }

  _proxyRegistry() {
    return new Contract(
      this._registryInfo().address,
      this._registryInfo().abi,
      this.get('web3')
        .ethersProvider()
        .getSigner()
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

  _setCurrentProxy(transaction) {
    return new Promise(async resolve => {
      await transaction;
      resolve(await this.getProxyAddress());
    });
  }

  _resetDefaults(newProxy) {
    this._currentProxy = newProxy;
    this._currentAccount = this.get('web3').currentAccount();
  }

  currentProxy() {
    return this._currentAccount === this.get('web3').currentAccount()
      ? this._currentProxy
      : this.getProxyAddress();
  }

  async build() {
    const transaction = this._proxyRegistry().build();
    this._currentProxy = await this._setCurrentProxy(transaction);
    return transaction;
  }

  execute(contract, method, args, options, address) {
    if (!address && !this._currentProxy)
      throw new Error('No proxy found for current account');
    const proxyAddress = address ? address : this.currentProxy();
    const proxyContract = this.getContractByProxyAddress(proxyAddress);
    const data = this.getCallData(contract, method, args);
    return proxyContract.execute(contract.address, data, options);
  }

  async getProxyAddress(providedAccount = false) {
    const account = providedAccount
      ? providedAccount
      : this.get('web3').currentAccount();

    let proxyAddress = await this._proxyRegistry().proxies(account);
    if (proxyAddress === '0x0000000000000000000000000000000000000000') {
      proxyAddress = null;
    }

    if (!providedAccount) this._resetDefaults(proxyAddress);
    return proxyAddress;
  }

  getContractByProxyAddress(address) {
    return new Contract(
      address,
      dappHub.dsProxy,
      this.get('web3')
        .ethersProvider()
        .getSigner()
    );
  }

  getCallData(contract, method, args) {
    return contract.interface.functions[method](...args).data;
  }

  async getOwner(address) {
    const contract = this.getContractByProxyAddress(address);
    return await contract.owner();
  }

  async setOwner(newOwner, proxyAddress = this._currentProxy) {
    const contract = this.getContractByProxyAddress(proxyAddress);
    return contract.setOwner(newOwner);
  }
}
