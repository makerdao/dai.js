import { PublicService } from '@makerdao/services-core';
import { createWatcher } from '@makerdao/multicall';
import debug from 'debug';
const log = debug('dai:MulticallService');

export default class MulticallService extends PublicService {
  constructor(name = 'multicall') {
    super(name, ['web3', 'smartContract']);
  }

  createWatcher(config = {}) {
    const web3 = this.get('web3');
    config = {
      multicallAddress: this.get('smartContract').getContractAddress('MULTICALL'),
      ...config
    };

    let onNewBlockPolling = false;
    if (config.interval === 'block') {
      onNewBlockPolling = true;
      config.interval = 60000; // 1 min polling fallback safeguard
    }

    if (config.useFetch) {
      delete config.useFetch;
      if (web3.usingWebsockets())
        throw new Error('Unable to use fetch with multicall when using websockets');
      if (!web3.rpcUrl) throw new Error('Unable to get rpcUrl for multicall');
      config.rpcUrl = web3.rpcUrl;
    } else config.web3 = web3._web3;

    this._watcher = createWatcher([], config);

    if (onNewBlockPolling) {
      log('Watcher created with poll on new block mode');
      web3.onNewBlock(blockNumber => {
        log(`Polling after new block detected: #${blockNumber}`);
        this.watcher.poll();
      });
    } else {
      log(
        `Watcher created with ${
          config.interval ? config.interval + 'ms' : 'default'
        } polling interval`
      );
    }

    this.watcher.onPoll(({ id, latestBlockNumber }) =>
      log(
        `Sending eth_call network request #${id} latestBlockNumber: ${latestBlockNumber}`
      )
    );
    this.watcher.onNewBlock(blockHeight => log(`Latest block: ${blockHeight}`));
  }

  tap(cb) {
    log('Watcher tapped');
    return this.watcher.tap(cb);
  }

  start() {
    log('Watcher started');
    return this.watcher.start();
  }

  disconnect() {
    // TODO
  }

  get watcher() {
    return this._watcher;
  }
}
