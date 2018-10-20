import PrivateService from '../core/PrivateService';
import { dappHub } from '../../contracts/abis';
import contracts from '../../contracts/contracts';

export default class DSProxyService extends PrivateService {
  constructor(name = 'proxy') {
    super(name, ['smartContract', 'web3']);
  }

  async authenticate() {
    this._default = await this.getProxyAddress();
  }

  defaultProxyAddress() {
    return this._default;
  }

  async getProxyAddress() {
    // For some reason, getting the proxy for the current account
    // returns a proxy address, but getting the owner of that proxy
    // returns 0x0...
    const accountAddress = this.get('web3').currentAccount();
    return await this.get('smartContract')
      .getContractByName(contracts.PROXY_REGISTRY)
      .proxies(accountAddress);
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
    return await this.getContractByProxyAddress(address).setOwner(
      '0x0000000000000000000000000000000000000000'
    );
  }
}
