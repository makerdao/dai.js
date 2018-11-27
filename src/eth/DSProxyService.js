import PrivateService from '../core/PrivateService';
import { Contract } from 'ethers';
import { dappHub, proxies } from '../../contracts/abis';

export default class DSProxyService extends PrivateService {
  constructor(name = 'proxy') {
    super(name, ['web3']);
  }

  async authenticate() {
    this._default = await this.getProxyAddress();
  }

  _setNewDefault(transaction) {
    return new Promise(async resolve => {
      await transaction;
      resolve(await this.getProxyAddress());
    });
  }

  _registryAddress() {
    return '0x9706786bf567796647d9428076fbc219830116ae';
  }

  defaultProxyAddress() {
    return this._currentAccount === this.get('web3').currentAccount()
      ? this._default
      : this.getProxyAddress();
  }

  proxyRegistry() {
    return new Contract(
      this._registryAddress(),
      proxies.proxyRegistry,
      this.get('web3')
        .ethersProvider()
        .getSigner()
    );
  }

  build() {
    const transaction = this.proxyRegistry().build();
    this._default = this._setNewDefault(transaction);
    return transaction;
  }

  execute(contract, method, args, options, address) {
    const proxyAddress = address ? address : this.defaultProxyAddress();
    const proxyContract = this.getContractByProxyAddress(proxyAddress);
    const data = this.getCallData(contract, method, args);
    console.log(options);
    return proxyContract.execute(contract.address, data, options);
  }

  async getProxyAddress(providedAccount = false) {
    const account = providedAccount
      ? providedAccount
      : this.get('web3').currentAccount();
    let proxyAddress;
    proxyAddress = await this.proxyRegistry().proxies(account);
    if (proxyAddress === '0x0000000000000000000000000000000000000000')
      proxyAddress = null;

    if (!providedAccount) {
      this._default = proxyAddress;
      this._currentAccount = account;
    }
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

  async getOwner(address = this._default) {
    const contract = await this.getContractByProxyAddress(address);
    return await contract.owner();
  }

  async clearOwner(address = this._default) {
    this._default = null;
    const contract = await this.getContractByProxyAddress(address);
    return await contract.setOwner(
      '0x0000000000000000000000000000000000000000'
    );
  }
}
