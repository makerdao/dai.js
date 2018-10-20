import PrivateService from '../core/PrivateService';
import { dappHub } from '../../contracts/abis';

export default class DSProxyService extends PrivateService {
  constructor(name = 'proxy') {
    super(name, ['smartContract']);
  }

  getContract(address) {
    return this.get('smartContract').getContractByAddressAndAbi(
      address,
      dappHub.dsProxy,
      { name: 'DS_PROXY' }
    );
  }

  getOwner(address) {
    return this.get(address).owner();
  }

  async clearOwner(address) {
    return await this.get(address).setOwner(
      '0x0000000000000000000000000000000000000000'
    );
  }
}
