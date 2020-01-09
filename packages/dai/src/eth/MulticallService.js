import { PublicService } from '@makerdao/services-core';
import { createWatcher } from '@makerdao/multicall';
import debug from 'debug';
import { zip, map } from 'rxjs';

const log = debug('dai:MulticallService');

const LOGICAL = 'logical';
const DERIVED = 'derived';

export default class MulticallService extends PublicService {
  constructor(name = 'multicall') {
    super(name, ['web3', 'smartContract']);

    observableStore = {};

    observableSchema = {
      generatedUserDebt: {
        type: LOGICAL,
        call: urnId => `vat.urn.${urnId}.art`
      },
      debtScalingFactor: {
        type: LOGICAL,
        call: ilkName => `vat.ilk.${ilkName}.rate`
      },
      daiGenerated: {
        type: DERIVED,
        dependents: ['generatedUserDebt', 'debtScalingFactor'],
        fn: ({ generatedUserDebt$, debtScalingFactor$ }) =>
          zip(generatedUserDebt$, debtScalingFactor$).pipe(
            map(([a, b]) => a * b)
          )
      }
    };
  }

  createWatcher({
    useWeb3Provider = false,
    interval = 'block',
    ...config
  } = {}) {
    const web3 = this.get('web3');
    config = {
      multicallAddress: this.get('smartContract').getContractAddress(
        'MULTICALL'
      ),
      ...config
    };

    let onNewBlockPolling;
    if (interval === 'block') {
      onNewBlockPolling = true;
      config.interval = 60000; // 1 min polling fallback safeguard
    }
    if (useWeb3Provider) config.web3 = web3._web3;
    else {
      if (!web3.rpcUrl) throw new Error('Unable to get rpcUrl for multicall');
      config.rpcUrl = web3.rpcUrl;
    }

    this._watcher = createWatcher([], config);

    if (onNewBlockPolling) {
      log(
        `Watcher created with poll on new block mode using ${
          config.rpcUrl ? `rpcUrl: ${config.rpcUrl}` : 'web3 provider'
        }`
      );
      web3.onNewBlock(blockNumber => {
        log(`Polling after new block detected (${blockNumber})`);
        this._watcher.poll();
      });
    } else {
      log(
        `Watcher created with ${
          config.interval ? config.interval + 'ms' : 'default'
        } polling interval using ${
          config.rpcUrl ? `rpcUrl: ${config.rpcUrl}` : 'web3 provider'
        }`
      );
    }

    this._watcher.onPoll(({ id, latestBlockNumber }) =>
      log(
        `Sending eth_call network request #${id}${
          latestBlockNumber ? ` (latestBlockNumber: ${latestBlockNumber})` : ''
        }`
      )
    );
    this._watcher.onNewBlock(blockHeight =>
      log(`Latest block: ${blockHeight}`)
    );

    return this._watcher;
  }

  tap(cb) {
    log('Watcher tapped');
    return this._watcher.tap(cb);
  }

  start() {
    log('Watcher started');
    return this._watcher.start();
  }

  registerSchema() {}

  disconnect() {
    // TODO
  }

  get watcher() {
    return this._watcher;
  }
}
