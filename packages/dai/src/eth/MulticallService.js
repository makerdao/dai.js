import { PublicService } from '@makerdao/services-core';
import { createWatcher } from '@makerdao/multicall';
import debug from 'debug';
import { Observable, ReplaySubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import get from 'lodash/get';
import set from 'lodash/set';

const log = debug('dai:MulticallService');
const log2 = debug('dai:MulticallService:observables');

export default class MulticallService extends PublicService {
  constructor(name = 'multicall') {
    super(name, ['web3', 'smartContract']);

    this._schemas = {};
    this._schemaByObservableKey = {};
    this._subjects = {};
    this._observables = {};
    this._watcherUpdates = null;
    this._watchingSchemasTotal = 0;

    this.addresses = {};
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

  schemaByObservableKey(key) {
    return this._schemaByObservableKey[key];
  }

  registerSchemas(schemas) {
    // this.addresses = this.get('smartContract').getContractAddresses();
    this._schemas = [...schemas];
    this._schemas.forEach(schema => {
      schema.watching = {};
      if (schema.keys)
        schema.keys.forEach(key => (this._schemaByObservableKey[key] = schema));
      if (schema.key) this._schemaByObservableKey[schema.key] = schema;
    });
  }

  watchObservable(key, ...args) {
    const path = args.join('.');
    const fullPath = `${key}.${path}`;

    const schema = this.schemaByObservableKey(key);
    const generatedSchema = schema.generate(...args);

    // Subscribe to updates from watcher and emit to subjects
    if (!this._watcherUpdates) {
      this._watcherUpdates = this._watcher.subscribe(update => {
        const subject = get(this._subjects, update.type);
        if (subject) subject.next(update.value);
      });
    }

    // This is a computed observable
    if (generatedSchema.computed) {
      const subs = generatedSchema.dependencies.map(dep => {
        const key = dep.shift();
        return this.watchObservable(key, ...dep);
      });
      return Observable.create(observer => {
        const observerLatest = combineLatest(subs).pipe(
          map(result => generatedSchema.computed(...result))
        );
        const sub = observerLatest.subscribe(observer);
        return () => {
          sub.unsubscribe();
        };
      });
    }

    // This is a base observable
    if (!get(this._subjects, fullPath)) {
      const subject = new ReplaySubject(1);
      set(this._subjects, fullPath, subject);

      // Create base observable
      const observable = Observable.create(observer => {
        this._watchingSchemasTotal++;
        // If this is the first subscriber to this schema
        if (!schema.watching[path]) {
          schema.watching[path] = 1;
          // Tap multicall to add schema (first subscriber to this schema)
          const { id, contractName, call, returns } = generatedSchema;
          log2(`Schema added to multicall: ${id}`);
          this._watcher.tap(calls => [
            ...calls,
            {
              id,
              target: this.addresses[contractName],
              call,
              returns
            }
          ]);
          this._watcher.tap(s => {
            log2('Current schemas:', s.map(({ id }) => id));
            return s;
          });
        } else schema.watching[path]++;
        log2('Schema subscribers:', schema.watching[path]);

        const sub = subject.subscribe(observer);
        return () => {
          // If no schemas are being watched, unsubscribe from watcher updates
          this._watchingSchemasTotal--;
          if (this._watchingSchemasTotal === 0) this._watcherUpdates.unsub();

          sub.unsubscribe();
          schema.watching[path]--;
          log2('Schema subscribers:', schema.watching[path]);
          if (schema.watching[path] === 0) {
            // Tap multicall to remove schema (last unsubscriber to this schema)
            log2(`Schema removed from multicall: ${generatedSchema.id}`);
            this._watcher.tap(schemas =>
              // TODO: make backwards compatible by checking undefined
              schemas.filter(({ id }) => id !== generatedSchema.id)
            );
            this._watcher.tap(s => {
              log2('Remaining schemas count:', s.length);
              return s;
            });
          }
        };
      });

      log2(`Created new observable: ${fullPath}`);
      set(this._observables, fullPath, observable);
      return observable;
    }
    log2(`Returning existing observable: ${fullPath}`);
    return get(this._observables, fullPath);
  }

  disconnect() {
    // TODO
  }

  get watcher() {
    return this._watcher;
  }
}
