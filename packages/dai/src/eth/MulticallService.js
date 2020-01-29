import { PublicService } from '@makerdao/services-core';
import { createWatcher } from '@makerdao/multicall';
import debug from 'debug';
import {
  Observable,
  ReplaySubject,
  combineLatest,
  from,
  interval,
  timer
} from 'rxjs';
import { map, first, flatMap, throttle, debounce, take } from 'rxjs/operators';
import get from 'lodash/get';
import set from 'lodash/set';

const log = debug('dai:MulticallService');
const log2 = debug('dai:MulticallService:observables');

export default class MulticallService extends PublicService {
  constructor(name = 'multicall') {
    super(name, ['web3', 'smartContract']);

    this._schemas = [];
    this._schemaByObservableKey = {};
    this._subjects = {};
    this._observables = {};
    this._watcherUpdates = null;
    this._watchingSchemasTotal = 0;
    this._multicallResultCache = {};
    this._addresses = {};
    this._removeSchemaTimers = {};
    this._removeSchemaDelay = 1000;
  }

  initialize() {
    this.watch = this.watchObservable;
    this._addresses = this.get('smartContract').getContractAddresses();
  }

  authenticate() {
    this._connectedAddress = this.get('web3').currentAddress();
  }

  createWatcher({
    useWeb3Provider = false,
    interval = 'block',
    rpcUrl,
    ...config
  } = {}) {
    const web3 = this.get('web3');
    config = {
      multicallAddress: this.get('smartContract').getContractAddress(
        'MULTICALL'
      ),
      ...config
    };

    const onNewBlockPolling = interval === 'block';
    if (onNewBlockPolling) interval = 60000; // 1 min polling fallback safeguard

    if (useWeb3Provider) config.web3 = web3._web3;
    else if (!rpcUrl) {
      if (!web3.rpcUrl) new Error('Unable to get rpcUrl for multicall');
      rpcUrl = web3.rpcUrl;
    }

    this._watcher = createWatcher([], { ...config, interval, rpcUrl });

    if (onNewBlockPolling) {
      log(
        `Watcher created with poll on new block mode using ${
          rpcUrl ? `rpcUrl: ${rpcUrl}` : 'web3 provider'
        }`
      );
      web3.onNewBlock(blockNumber => {
        log(`Polling after new block detected (${blockNumber})`);
        this._watcher.poll();
      });
    } else {
      log(
        `Watcher created with ${interval}ms polling interval using ${
          useWeb3Provider ? 'web3 provider' : `rpcUrl: ${rpcUrl}`
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

  get observableKeys() {
    return Object.keys(this._schemaByObservableKey);
  }

  registerSchemas(schemas) {
    if (typeof schemas !== 'object')
      throw new Error('Schemas must be object or array');

    // If schemas is key/val object use key as schema key and convert to array object
    if (!Array.isArray(schemas))
      schemas = Object.keys(schemas).map(key => ({ key, ...schemas[key] }));
    // Clone if array
    else schemas = schemas.map(item => ({ ...item }));

    schemas.forEach(schema => {
      schema.watching = {};
      // Automatically use schema key as return key if no return keys specified
      if (!schema.return && !schema.returns) schema.returns = [schema.key];
      if (schema.return && schema.returns) throw new Error('Ambiguous return definitions in schema: found both return and returns property'); // prettier-ignore
      if (schema.return) schema.returns = [schema.return];
      if (!Array.isArray(schema.returns)) throw new Error('Schema must contain return/returns property'); // prettier-ignore
      // Use return keys to create observable key => schema mapping
      // and normalize as array of [key, transform] arrays
      schema.returns = schema.returns.map(ret => {
        if (!Array.isArray(ret)) ret = [ret];
        this._schemaByObservableKey[ret[0]] = schema;
        if (ret.length > 2) throw new Error('Returns array format should be [key, transform]'); // prettier-ignore
        return ret;
      });
    });
    this._schemas = [...this._schemas, ...schemas];
    log2(`Registered ${schemas.length} schemas`);
  }

  watchObservable(key, ...args) {
    const schema = this.schemaByObservableKey(key);
    if (!schema)
      throw new Error(`No registered schema found for observable key: ${key}`);

    // Generate schema
    let generatedSchema = schema.generate(...args);

    const path = [
      generatedSchema.demarcate ? this.get('web3').currentAddress() : undefined,
      ...args
    ]
      .filter(x => x)
      .join('.');
    const fullPath = `${key}${path ? '.' : ''}${path}`;

    log2(`watchObservable() called for ${generatedSchema.computed ? 'computed ' : 'base '}observable: ${fullPath}`); // prettier-ignore

    // Check if an observable already exists for this path (key + args)
    const existingObservable = get(this._observables, fullPath);
    if (existingObservable) {
      const isComputed = !get(this._subjects, fullPath, subject);
      log2(`watchObservable() called for ${isComputed ? 'computed ' : 'base '}observable: ${fullPath}`); // prettier-ignore
      log2(`Returning existing ${isComputed ? 'computed ' : 'base '}observable: ${fullPath}`); // prettier-ignore
      return existingObservable;
    }

    if (args.length < generatedSchema.length)
      throw new Error(`Observable ${key} expects at least ${generatedSchema.length} argument${generatedSchema.length > 1 ? 's' : ''}`); // prettier-ignore

    // Handle computed observable
    if (generatedSchema.computed) {
      // Handle dynamically generated dependencies
      const dependencies =
        typeof generatedSchema.dependencies === 'function'
          ? generatedSchema.dependencies({
              watch: this.watchObservable.bind(this),
              get: this.get.bind(this)
            })
          : generatedSchema.dependencies;

      const recurseDependencyTree = trie => {
        let key = trie.shift();
        // This is a promise dependency
        if (typeof key === 'function') {
          return from(key());
        }

        const indexesAtLeafNodes = trie.map(node => !Array.isArray(node));
        const allLeafNodes = indexesAtLeafNodes.every(node => node === true);

        if (Array.isArray(trie) && trie.length === 0) {
          // When trie is an empty array, indicates that we only need to return
          // watchObservable on the key
          return this.watchObservable(key);
        } else if (allLeafNodes) {
          // If the trie is an array it indicates that the observable is
          // expecting arguments. These can be normal values or other
          // observables. Where an index in the trie is an array, it is
          // assumed that it is syntax for an observable argument. In the case
          // where all indexes in the trie array are normal values, we use the
          // spread operator to pass them to the returned watchObservable fn
          return this.watchObservable(key, ...trie);
        } else {
          // When a trie array has nested observables, recursively call this fn
          // on indexes which have an array.
          return combineLatest(
            trie.map((node, idx) => {
              return indexesAtLeafNodes[idx]
                ? [node]
                : recurseDependencyTree(node);
            })
          ).pipe(
            throttle(() => interval(1)),
            flatMap(result => this.watchObservable(key, ...result))
          );
        }
      };

      const dependencySubs = dependencies.map(recurseDependencyTree);

      const observerLatest = combineLatest(dependencySubs).pipe(
        throttle(() => interval(1)),
        map(result => generatedSchema.computed(...result))
      );

      // Create computed observable
      const observable = Observable.create(observer => {
        const sub = observerLatest.subscribe(observer);
        return () => {
          sub.unsubscribe();
        };
      });
      log2(`Created new computed observable: ${fullPath}`);
      set(this._observables, fullPath, observable);
      return observable;
    }

    // This is a base observable
    const subject = new ReplaySubject(1);
    set(this._subjects, fullPath, subject);
    if (this._multicallResultCache[fullPath])
      subject.next(this._multicallResultCache[fullPath]);

    // Create base observable
    const observable = Observable.create(observer => {
      // Subscribe to watcher updates and emit them to subjects
      if (!this._watcherUpdates) {
        log2('Subscribed to watcher updates');
        this._watcherUpdates = this._watcher.subscribe(update => {
          const subject = get(this._subjects, update.type);
          if (subject) subject.next(update.value);
          else this._multicallResultCache[update.type] = update.value;
        });
      }
      this._watchingSchemasTotal++;
      if (schema.watching[path] === undefined) schema.watching[path] = 0;

      // If first subscriber to this schema add it to multicall
      if (++schema.watching[path] === 1) this._addSchemaToMulticall(schema, generatedSchema, path); // prettier-ignore
      log2(`Subscriber count for schema ${generatedSchema.id}: ${schema.watching[path]}`); // prettier-ignore

      const sub = subject.subscribe(observer);
      return () => {
        sub.unsubscribe();
        // If last unsubscriber from this schema remove it from multicall
        if (--schema.watching[path] === 0) this._removeSchemaFromMulticall(generatedSchema);
        else log2(`Subscriber count for schema ${generatedSchema.id}: ${schema.watching[path]}`); // prettier-ignore
      };
    });

    log2(`Created new base observable: ${fullPath}`);
    set(this._observables, fullPath, observable);
    return observable;
  }

  latest(key, ...args) {
    // TODO Possible configuration setting for timer?
    return this.watchObservable(key, ...args)
      .pipe(
        debounce(() => timer(100)),
        take(1)
      )
      .toPromise();
  }

  _addSchemaToMulticall(schema, generatedSchema, path) {
    let { id, contractName, call, returns, transforms = {} } = generatedSchema;
    // If this schema is already added but pending removal
    if (this._removeSchemaTimers[id]) {
      log2(`Cleared pending schema removal for: ${id}`);
      clearTimeout(this._removeSchemaTimers[id]);
      this._removeSchemaTimers[id] = null;
      return;
    }
    // Automatically generate return keys if not explicitly specified in generated schema
    if (!returns)
      returns = schema.returns.map(ret => {
        const key = ret[0];
        const fullPath = `${key}${path ? '.' : ''}${path}`;
        return transforms[key]
          ? [fullPath, transforms[key]] // Use transform mapping in generated schema if available
          : ret.length == 2
          ? [fullPath, ret[1]]
          : [fullPath];
      });
    if (!this._addresses[contractName]) throw new Error(`Can't find contract address for ${contractName}`); // prettier-ignore
    this._watcher.tap(calls => [
      ...calls,
      {
        id,
        target: this._addresses[contractName],
        call,
        returns
      }
    ]);
    log2(`Schema added to multicall: ${id}`);
    this._watcher.tap(s => {
      log2('Current schemas: ' + s.filter(({ id }) => id).map(({ id }) => id).join(',')); // prettier-ignore
      log2(`Total schemas in multicall: ${s.filter(({ id }) => id).length}`);
      return s;
    });
  }

  _removeSchemaFromMulticall({ id }) {
    this._removeSchemaTimers[id] = setTimeout(() => {
      this._removeSchemaTimers[id] = null;
      log2(`Schema removed from multicall: ${id}`);
      this._watcher.tap(schemas => schemas.filter(({ id: id_ }) => id_ !== id));
      this._watcher.tap(s => {
        log2(`Total schemas in multicall: ${s.filter(({ id }) => id).length}`);
        return s;
      });
      // If no schemas are being watched, unsubscribe from watcher updates
      if (--this._watchingSchemasTotal === 0) {
        log2('Unsubscribed from watcher updates');
        this._watcherUpdates.unsub();
        this._watcherUpdates = null;
      }
    }, this._removeSchemaDelay);
  }

  disconnect() {
    // TODO
  }

  get watcher() {
    return this._watcher;
  }
}
