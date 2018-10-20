import PrivateService from '../core/PrivateService';
import { dappHub } from '../../contracts/abis';
import contracts from '../../contracts/contracts';

export default class DSProxyService extends PrivateService {
  constructor(name = 'proxy') {
    super(name, ['smartContract', 'web3']);
  }

  async authenticate() {
    this._defaultAddress = await this.getProxyAddress();
  }

  async getProxyAddress() {
    const accountAddress = this.get('web3').currentAccount();
    return await this.get('smartContract')
      .getContractByName(contracts.PROXY_REGISTRY)
      .proxies(accountAddress);
  }

  getContractByProxyAddress(address = this._defaultAddress) {
    return this.get('smartContract').getContractByAddressAndAbi(
      address,
      dappHub.dsProxy,
      { name: 'DS_PROXY' }
    );
  }

  getOwner(address = this._defaultAddress) {
    return this.getContractByProxyAddress(address).owner();
  }

  async clearOwner(address = this._defaultAddress) {
    const proxy = await this.getContractByProxyAddress(address);
    return await proxy.setOwner('0x0000000000000000000000000000000000000000');
  }
}
