import PrivateService from '../core/PrivateService';
import { dappHub } from '../../contracts/abis';
import contracts from '../../contracts/contracts';

export default class DSProxyService extends PrivateService {
  constructor(name = 'proxy') {
    super(name, ['smartContract', 'web3', 'transactionManager']);
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

  defaultProxyAddress() {
    return this._default;
  }

  proxyRegistry() {
    return this.get('smartContract').getContractByName(
      contracts.PROXY_REGISTRY
    );
  }

  build() {
    const transaction = this.proxyRegistry().build();
    this._default = this._setNewDefault(transaction);
    return transaction;
  }

  async getProxyAddress(providedAccount = false) {
    let proxyAddress;
    const account = providedAccount
      ? providedAccount
      : this.get('web3').currentAccount();
    console.log('in proxy service', account);
    proxyAddress = await this.get('smartContract')
      .getContractByName(contracts.PROXY_REGISTRY)
      .proxies(account);
    if (proxyAddress === '0x0000000000000000000000000000000000000000')
      proxyAddress = null;

    this._default = proxyAddress;
    return proxyAddress;
  }

  async getContractByProxyAddress(address = this._default) {
    if (address)
      return await this.get('smartContract').getContractByAddressAndAbi(
        address,
        dappHub.dsProxy,
        { name: 'DS_PROXY' }
      );
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
