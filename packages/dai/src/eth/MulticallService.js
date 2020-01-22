import { PublicService } from '@makerdao/services-core';
import { createWatcher } from '@makerdao/multicall';
import debug from 'debug';
import { Observable, ReplaySubject, combineLatest, from } from 'rxjs';
import { map, first, flatMap } from 'rxjs/operators';
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
  }

  initialize() {
    this.watch = this.watchObservable;
    this._addresses = this.get('smartContract').getContractAddresses();
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
      if (schema.return && schema.returns)
        throw new Error(
          'Ambiguous return definitions in schema: found both return and returns property'
        );
      if (schema.return) schema.returns = [schema.return];
      if (!Array.isArray(schema.returns))
        throw new Error('Schema must contain return/returns property');
      // Use return keys to create observable keys => schema mapping
      schema.returns.forEach(ret => {
        if (Array.isArray(ret)) this._schemaByObservableKey[ret[0]] = schema;
        else if (typeof ret === 'string')
          this._schemaByObservableKey[ret] = schema;
      });
    });
    this._schemas = [...this._schemas, ...schemas];
    log2(`Registered ${schemas.length} schemas`);
  }

  watchObservable(key, ...args) {
    const path = args.join('.');
    const fullPath = `${key}${path ? '.' : ''}${path}`;

    const schema = this.schemaByObservableKey(key);
    if (!schema)
      throw new Error(`No registered schema found for observable key: ${key}`);
    const generatedSchema = schema.generate(...args);
    log2(
      `watchObservable() called for ${
        generatedSchema.computed ? 'computed ' : 'base '
      }observable: ${fullPath}`
    );

    const existingObservable = get(this._observables, fullPath);
    if (existingObservable) {
      log2(
        `Returning existing ${
          generatedSchema.computed ? 'computed ' : 'base '
        }observable: ${fullPath}`
      );
      return existingObservable;
    }

    // Handle computed observable
    if (generatedSchema.computed) {
      // Handle dynamically generated dependencies
      const dependencies =
        typeof generatedSchema.dependencies === 'function'
          ? generatedSchema.dependencies(this.watchObservable.bind(this))
          : generatedSchema.dependencies;

      const recurseDependencyTree = trie => {
        let key = trie.shift();
        // This is a promise dependency
        if (typeof key === 'function') {
          return from(key());
        }

        let atLeafNode = false;
        const [checker] = trie;
        if (!Array.isArray(checker)) {
          atLeafNode = true;
        }

        if (Array.isArray(trie) && !atLeafNode) {
          if (trie.length > 1) {
            return combineLatest(trie.map(recurseDependencyTree)).pipe(
              flatMap(result => {
                return this.watchObservable(key, ...result);
              })
            );
          } else {
            const next = trie.shift();
            return recurseDependencyTree(next).pipe(
              flatMap(result => {
                return Array.isArray(result)
                  ? this.watchObservable(key, ...result)
                  : this.watchObservable(key, result);
              })
            );
          }
        } else {
          if (Array.isArray(trie) && trie.length === 0)
            return this.watchObservable(key);
          return this.watchObservable(key, ...trie);
        }
      };

      const dependencySubs = dependencies.map(recurseDependencyTree);

      const observerLatest = combineLatest(dependencySubs).pipe(
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

      // First subscriber to this schema
      if (!schema.watching[path]) {
        schema.watching[path] = 1;
        // Tap multicall to add schema (first subscriber to this schema)
        this._tapMulticallWithSchema(schema, generatedSchema, path);
      } else schema.watching[path]++;

      log2(
        `Subscriber count for schema ${generatedSchema.id}: ${schema.watching[path]}`
      );

      const sub = subject.subscribe(observer);
      return () => {
        // If no schemas are being watched, unsubscribe from watcher updates
        if (--this._watchingSchemasTotal === 0) {
          log2('Unsubscribed from watcher updates');
          this._watcherUpdates.unsub();
          this._watcherUpdates = null;
        }
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
            log2(`Remaining schemas: ${s.filter(({ id }) => id).length}`);
            return s;
          });
        }
      };
    });

    log2(`Created new base observable: ${fullPath}`);
    set(this._observables, fullPath, observable);
    return observable;
  }

  latest(key, ...args) {
    return this.watchObservable(key, ...args)
      .pipe(first())
      .toPromise();
  }

  _tapMulticallWithSchema(schema, generatedSchema, path) {
    let { id, contractName, call, returns } = generatedSchema;
    // Automatically generate return keys if not specified in schema
    if (!returns)
      returns = schema.returns.map(ret => {
        let key = Array.isArray(ret) ? ret[0] : ret;
        key = `${key}${path ? '.' : ''}${path}`;
        return Array.isArray(ret) && ret.length == 2 ? [key, ret[1]] : [key];
      });
    if (!this._addresses[contractName])
      throw new Error(`Can't find contract address for ${contractName}`);
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
      log2('Current schemas:', s.filter(({ id }) => id).map(({ id }) => id));
      return s;
    });
  }

  disconnect() {
    // TODO
  }

  get watcher() {
    return this._watcher;
  }
}
