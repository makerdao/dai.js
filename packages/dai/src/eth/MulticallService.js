import { PublicService } from '@makerdao/services-core';
import { createWatcher } from '@makerdao/multicall';

export default class MulticallService extends PublicService {
  constructor(name = 'multicall') {
    super(name, ['web3', 'smartContract']);
  }

  // TODO allow disabling multicall
  // initialize(settings = {}) { }

  connect() {
    const { rpcUrl } = this.get('web3');
    const multicallAddress = this.get('smartContract').getContractAddress(
      'MULTICALL'
    );
    this._watcher = createWatcher([], { rpcUrl, multicallAddress });
  }

  disconnect() {
    // TODO
  }

  get watcher() {
    return this._watcher;
  }

  // TODO handle rpc url changes
}
