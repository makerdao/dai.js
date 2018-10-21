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

  defaultProxyAddress() {
    return this._default;
  }

  proxyFactory() {
    return this.get('smartContract').getContractByName(
      contracts.DS_PROXY_FACTORY
    );
  }

  build() {
    return this.proxyFactory().build();
  }

  async getProxyAddress() {
    const accountAddress = this.get('web3').currentAccount();
    const proxyAddress = await this.get('smartContract')
      .getContractByName(contracts.PROXY_REGISTRY)
      .proxies(accountAddress);
    this._default = proxyAddress;

    return proxyAddress;
  }

  async getContractByProxyAddress(address = this._default) {
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
    this._default = undefined;
    const contract = await this.getContractByProxyAddress(address);
    return await contract.setOwner(
      '0x0000000000000000000000000000000000000000'
    );
  }
}
