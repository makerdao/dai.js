import { PublicService } from '@makerdao/services-core';
import { createWatcher } from '@makerdao/multicall';
import debug from 'debug';
import { Observable, ReplaySubject, combineLatest, from } from 'rxjs';
import { map, flatMap, throttleTime, debounceTime, take } from 'rxjs/operators';
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
    this._totalSchemaSubscribers = 0;
    this._totalActiveSchemas = 0;
    this._multicallResultCache = {};
    this._addresses = {};
    this._removeSchemaTimers = {};
  }

  initialize(settings = {}) {
    this._addresses = settings.addresses || this.get('smartContract').getContractAddresses();
    this._removeSchemaDelay = settings.removeSchemaDelay || 1000;
    this._debounceTime = settings.debounceTime || 100;
    this._computedThrottleTime = settings.computedThrottleTime || 1;
  }

  authenticate() {
    this._connectedAddress = this.get('web3').currentAddress();
  }

  createWatcher({ useWeb3Provider = false, interval = 'block', rpcUrl, ...config } = {}) {
    const web3 = this.get('web3');
    config = {
      multicallAddress: this.get('smartContract').getContractAddress('MULTICALL'),
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
      log(`Watcher created with poll on new block mode using ${rpcUrl ? `rpcUrl: ${rpcUrl}` : 'web3 provider'}`); // prettier-ignore
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

    this._watcher.onPoll(({ id, latestBlockNumber: block }) =>
      log(`Sending network request #${id}${block ? ` (latest block: ${block})` : ''}`)
    );
    this._watcher.onNewBlock(block => log(`Latest block: ${block}`));
    this._watcher.onError(err => console.error('Multicall error:', err));

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

  stop() {
    this._flushPendingSchemaRemovals();
    log('Watcher stopped');
    return this._watcher.stop();
  }

  restart() {
    this.stop();
    this.start();
  }

  schemaByObservableKey(key) {
    return this._schemaByObservableKey[key];
  }

  get observableKeys() {
    return Object.keys(this._schemaByObservableKey);
  }

  get watcher() {
    return this._watcher;
  }

  get activeSchemas() {
    return this._watcher.schemas.filter(({ id }) => id); // Filter only schemas with id
  }

  get activeSchemaIds() {
    return this.activeSchemas.map(({ id }) => id);
  }

  get totalActiveSchemas() {
    return this._totalActiveSchemas;
  }

  get totalSchemaSubscribers() {
    return this._totalSchemaSubscribers;
  }

  registerSchemas(schemas) {
    if (typeof schemas !== 'object') throw new Error('Schemas must be object or array');

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
      if (!Array.isArray(schema.returns))
        throw new Error('Schema must contain return/returns property');
      // Use return keys to create observable key => schema mapping
      // and normalize as array of [key, transform] arrays
      schema.returns = schema.returns.map(ret => {
        if (!Array.isArray(ret)) ret = [ret];
        if (this._schemaByObservableKey[ret[0]] !== undefined)
          throw new Error(`Observable with key ${ret[0]} already registered`);
        this._schemaByObservableKey[ret[0]] = schema;
        if (ret.length > 2) throw new Error('Returns array format should be [key, transform]');
        return ret;
      });
    });
    this._schemas = [...this._schemas, ...schemas];
    log2(`Registered ${schemas.length} schemas`);
  }

  watch(key, ...args) {
    const schema = this.schemaByObservableKey(key);
    if (!schema) throw new Error(`No registered schema found for observable key: ${key}`);

    // Validate schema params
    if (schema.validateParams) schema.validateParams(...args);

    // Generate schema
    let generatedSchema = schema.generate(...args);

    const path = [
      generatedSchema.demarcate ? this.get('web3').currentAddress() : undefined,
      ...args
    ]
      .filter(x => x)
      .join('.');
    const fullPath = `${key}${path ? '.' : ''}${path}`;

    log2(`watch() called for ${generatedSchema.computed ? 'computed ' : 'base '}observable: ${fullPath}`); // prettier-ignore

    // Check if an observable already exists for this path (key + args)
    const existingObservable = get(this._observables, fullPath);
    if (existingObservable) {
      const isComputed = !get(this._subjects, fullPath, subject);
      log2(`Returning existing ${isComputed ? 'computed ' : 'base '}observable: ${fullPath}`);
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
              watch: this.watch.bind(this),
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
          // watch on the key
          return this.watch(key);
        } else if (allLeafNodes) {
          // If the trie is an array it indicates that the observable is
          // expecting arguments. These can be normal values or other
          // observables. Where an index in the trie is an array, it is
          // assumed that it is syntax for an observable argument. In the case
          // where all indexes in the trie array are normal values, we use the
          // spread operator to pass them to the returned watch fn
          return this.watch(key, ...trie);
        } else {
          // When a trie array has nested observables, recursively call this fn
          // on indexes which have an array.
          return combineLatest(
            trie.map((node, idx) => {
              return indexesAtLeafNodes[idx] ? [node] : recurseDependencyTree(node);
            })
          ).pipe(
            throttleTime(this._computedThrottleTime),
            flatMap(result => this.watch(key, ...result))
          );
        }
      };

      const dependencySubs = dependencies.map(recurseDependencyTree);

      const observerLatest = combineLatest(dependencySubs).pipe(
        throttleTime(this._computedThrottleTime),
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
    // Emit initial value if cached result from multicall exists
    if (
      this._multicallResultCache[fullPath] !== undefined &&
      this._validateResult(subject, fullPath, this._multicallResultCache[fullPath])
    )
      subject.next(this._multicallResultCache[fullPath]);

    // Create base observable
    const observable = Observable.create(observer => {
      this._totalSchemaSubscribers++;
      // Subscribe to watcher updates and emit them to subjects
      if (!this._watcherUpdates) this._subscribeToWatcherUpdates();
      // If first subscriber to this schema add it to multicall
      if (schema.watching[path] === undefined) schema.watching[path] = 0;
      if (++schema.watching[path] === 1) this._addSchemaToMulticall(schema, generatedSchema, path);
      // Subscribe this observer to the subject for this base observable
      const sub = subject.subscribe(observer);
      log2(`Observer subscribed to ${generatedSchema.id} (${schema.watching[path]} subscribers)`);
      // Return the function to call when this observer unsubscribes
      return () => {
        // If last unsubscriber from this schema remove it from multicall
        if (--schema.watching[path] === 0) this._removeSchemaFromMulticall(generatedSchema);
        // Unsubscribe this observer from the subject for this base observable
        sub.unsubscribe();
        log2(`Observer unsubscribed from ${generatedSchema.id} (${schema.watching[path]} subscribers)`); // prettier-ignore
      };
    });

    log2(`Created new base observable: ${fullPath}`);
    set(this._observables, fullPath, observable);
    return observable;
  }

  latest(key, ...args) {
    return this.watch(key, ...args)
      .pipe(
        debounceTime(this._debounceTime),
        take(1)
      )
      .toPromise();
  }

  _addSchemaToMulticall(schema, generatedSchema, path) {
    let { id, target, contractName, call, returns, transforms = {} } = generatedSchema;
    // If this schema is already added but pending removal
    if (this._removeSchemaTimers[id]) {
      log2(`Cancelled pending schema removal: ${id}`);
      clearTimeout(this._removeSchemaTimers[id]);
      delete this._removeSchemaTimers[id];
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
    if (!target && !contractName) throw new Error('Schema must specify target or contractName');
    if (!target && !this._addresses[contractName]) throw new Error(`Can't find contract address for ${contractName}`); // prettier-ignore
    this._totalActiveSchemas++;
    this._watcher.tap(calls => [
      ...calls,
      {
        id,
        target: target || this._addresses[contractName],
        call,
        returns
      }
    ]);
    log2(`Schema added to multicall: ${id}`);
    if (process?.browser) log2('Active schemas (' + this._totalActiveSchemas + ' total):', this.activeSchemaIds);
    else log2(`Active schemas (${this._totalActiveSchemas} total): ${this.activeSchemaIds.join(',')}`); // prettier-ignore
  }

  _removeSchemaImmediately(id) {
    if (this._removeSchemaTimers[id] !== undefined) delete this._removeSchemaTimers[id];
    log2(`Schema removed from multicall: ${id}`);
    this._watcher.tap(schemas => schemas.filter(({ id: id_ }) => id_ !== id));
    if (--this._totalActiveSchemas === 0) log2('No remaining active schemas');
    // If no schemas are being watched, unsubscribe from watcher updates
    if (--this._totalSchemaSubscribers === 0) {
      log2('Unsubscribed from watcher updates');
      this._watcherUpdates.unsub();
      this._watcherUpdates = null;
    } else {
      if (process?.browser) log2('Active schemas (' + this._totalActiveSchemas + ' total):', this.activeSchemaIds);
      else log2(`Active schemas (${this._totalActiveSchemas} remaining): ${this.activeSchemaIds.join(',')}`); // prettier-ignore
    }
  }

  _removeSchemaFromMulticall({ id, immediate = false }) {
    if (immediate) this._removeSchemaImmediately(id);
    else
      this._removeSchemaTimers[id] = setTimeout(
        () => this._removeSchemaImmediately(id),
        this._removeSchemaDelay
      );
  }

  _flushPendingSchemaRemovals() {
    const schemaTimers = Object.keys(this._removeSchemaTimers);
    if (schemaTimers.length === 0) return;
    log2(`Flushing ${schemaTimers.length} pending schema removals`);
    for (let id of schemaTimers) {
      log2(`Forcing schema removal: ${id}`);
      clearTimeout(this._removeSchemaTimers[id]);
      this._removeSchemaImmediately(id);
    }
  }

  _validateResult(subject, type, value) {
    const [observableKey] = type.split('.');
    const schema = this._schemaByObservableKey[observableKey];
    if (!schema.validateReturns?.hasOwnProperty(observableKey)) return true;
    const validator = schema.validateReturns[observableKey];
    try {
      validator(value);
      return true;
    } catch (err) {
      log2('Validation error for ' + type + ' result:', value);
      subject.error(err);
      return false;
    }
  }

  _subscribeToWatcherUpdates() {
    log2('Subscribed to watcher updates');
    this._watcherUpdates = this._watcher.subscribe(update => {
      const subject = get(this._subjects, update.type);
      if (subject) {
        const logValue = update.value?._isBigNumber
          ? `${update.value.toString()} (BigNumber)`
          : update.value;
        log2('Got watcher update for ' + update.type + ':', logValue);
        if (this._validateResult(subject, update.type, update.value)) subject.next(update.value);
      } else this._multicallResultCache[update.type] = update.value;
    });
  }
}
