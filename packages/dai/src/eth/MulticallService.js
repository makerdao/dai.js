import { PublicService } from '@makerdao/services-core';
import { createWatcher } from '@makerdao/multicall';
import debug from 'debug';
import { Observable, ReplaySubject, combineLatest, from, throwError, timer } from 'rxjs';
import {
  map,
  flatMap,
  debounceTime,
  take,
  catchError,
  filter,
  takeUntil,
  throwIfEmpty,
  tap
} from 'rxjs/operators';
import get from 'lodash/get';
import set from 'lodash/set';
import find from 'lodash/find';

const log = debug('dai:MulticallService');
const log2 = debug('dai:MulticallService:observables');

const throwIfErrorInValues = values => values.map(v => { if (v instanceof Error) throw v; }); // prettier-ignore
const checkForErrors = values => find(values, v => v instanceof Error) === undefined;
const catchNestedErrors = key => f =>
  catchError(err => {
    log2(`Caught nested error in ${key}: ${err}`);
    return from([new Error(err)]);
  })(f);

export default class MulticallService extends PublicService {
  constructor(name = 'multicall') {
    super(name, ['web3', 'smartContract']);

    this._schemas = [];
    this._schemaByObservableKey = {};
    this._schemaInstances = {};
    this._subjects = {};
    this._observables = {};
    this._watcherUpdates = null;
    this._schemaSubscribers = {};
    this._totalSchemaSubscribers = 0;
    this._totalActiveSchemas = 0;
    this._multicallResultCache = {};
    this._addresses = {};
    this._removeSchemaTimers = {};
  }

  initialize(settings = {}) {
    this._addresses = settings.addresses || this.get('smartContract').getContractAddresses();
    this._removeSchemaDelay = settings.removeSchemaDelay || 1000;
    this._debounceTime = settings.debounceTime || 1;
    this._latestDebounceTime = settings.latestDebounceTime || 1;
    this._latestTimeout = settings.latestTimeout || 10000;
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
    if (!key) throw new Error('Invalid observable key');
    if (!this._schemaByObservableKey[key])
      throw new Error(`No registered schema definition found with observable key: ${key}`);
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

  // Register schema definitions
  registerSchemas(schemas) {
    if (typeof schemas !== 'object') throw new Error('Schemas must be object or array');

    // If schemas is key/val object use key as schema key and convert to array object
    if (!Array.isArray(schemas)) schemas = Object.keys(schemas).map(key => ({ key, ...schemas[key] })); // prettier-ignore
    // Clone if array
    else schemas = schemas.map(item => ({ ...item }));

    schemas.forEach(schema => {
      if (!schema.key) throw new Error('Schema definitions must have a unique key');
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

  latest(key, ...args) {
    const obsPath = `${key}${args.length > 0 ? '.' : ''}${args.join('.')}`;
    return this._watch({ depth: 0, throwIfError: true }, key, ...args)
      .pipe(
        catchError(err => {
          throw new Error(err);
        }),
        takeUntil(timer(this._latestTimeout)),
        throwIfEmpty(() => new Error(`Timed out waiting for latest value of: ${obsPath}`)),
        debounceTime(this._latestDebounceTime),
        take(1)
      )
      .toPromise();
  }

  watch(key, ...args) {
    return this._watch({ depth: 0 }, key, ...args);
  }

  _watch({ depth, throwIfError = false }, key, ...args) {
    // Find schema definition associated with this observable key
    const schemaDefinition = this.schemaByObservableKey(key);
    const expectedArgs = schemaDefinition.generate.length;
    if (args.length < expectedArgs)
      return throwError(`Observable ${key} expects at least ${expectedArgs} argument(s)`);

    const obsPath = `${key}${args.length > 0 ? '.' : ''}${args.join('.')}`;

    // Validate arguments using schema args validator
    if (schemaDefinition?.validate?.args) {
      const validate = schemaDefinition.validate.args(...args);
      if (validate) {
        log2(`Input validation failed for observable: ${obsPath} (depth: ${depth})`);
        return throwError(validate);
      }
    }

    // Create or get existing schema instance for this instance path (schema definition + args)
    const schemaInstance = this._createSchemaInstance(schemaDefinition, ...args);
    const { computed } = schemaInstance;
    log2(`watch() called for ${computed ? 'computed ' : 'base '}observable: ${obsPath} (depth: ${depth})`); // prettier-ignore

    // Return existing observable if one already exists for this observable path (key + args)
    let existing = get(this._observables, obsPath);
    if (existing) {
      if (computed) {
        log2(`Returning existing computed observable: ${obsPath} (depth: ${depth})`);
        // Only debounce if call to watch() is not nested
        if (depth === 0) existing = existing.pipe(debounceTime(this._debounceTime));
        if (throwIfError) existing = existing.pipe(tap(throwIfErrorInValues));
        return existing.pipe(
          // Don't pass values to computed() if any of them are errors
          filter(checkForErrors),
          // Pass values to computed() on the computed observable
          map(result => computed(...result))
        );
      }
      log2(`Returning existing base observable: ${obsPath}`);
      return existing;
    }

    // Handle computed observable
    if (computed) {
      // Handle dynamically generated dependencies
      const dependencies =
        typeof schemaInstance.dependencies === 'function'
          ? schemaInstance.dependencies({
              watch: this.watch.bind(this),
              get: this.get.bind(this)
            })
          : schemaInstance.dependencies;

      const recurseDependencyTree = trie_ => {
        const key = trie_[0];
        const trie = trie_.slice(1);

        // If the dependency key provided is a function, promise or array of
        // values then this dependency is providing its own custom value
        // rather than specifying an existing observable key
        if (key instanceof Promise || Array.isArray(key)) return from(key);
        if (typeof key === 'function') return from(key());

        const indexesAtLeafNodes = trie.map(node => !Array.isArray(node));
        const allLeafNodes = indexesAtLeafNodes.every(node => node === true);

        if (Array.isArray(trie) && trie.length === 0) {
          // When trie is an empty array, indicates that we only need to return
          // watch on the key
          return this._watch({ depth: depth + 1 }, key);
        } else if (allLeafNodes) {
          // If the trie is an array it indicates that the observable is
          // expecting arguments. These can be normal values or other
          // observables. Where an index in the trie is an array, it is
          // assumed that it is syntax for an observable argument. In the case
          // where all indexes in the trie array are normal values, we use the
          // spread operator to pass them to the returned watch fn
          return this._watch({ depth: depth + 1 }, key, ...trie);
        } else {
          // When a trie array has nested observables, recursively call this fn
          // on indexes which have an array.
          return combineLatest(
            trie.map((node, idx) => {
              return indexesAtLeafNodes[idx] ? [node] : recurseDependencyTree(node);
            })
          ).pipe(
            flatMap(result =>
              this._watch({ depth: depth + 1 }, key, ...result).pipe(catchNestedErrors(key))
            )
          );
        }
      };

      const dependencySubs = dependencies.map(recurseDependencyTree);
      let observable = combineLatest(dependencySubs);

      log2(`Created new computed observable: ${obsPath} (depth: ${depth})`);
      set(this._observables, obsPath, observable);
      // Only debounce if call to watch() is not nested
      if (depth === 0) observable = observable.pipe(debounceTime(this._debounceTime));
      if (throwIfError) observable = observable.pipe(tap(throwIfErrorInValues));
      return observable.pipe(
        // Don't pass values to computed() if any of them are errors
        filter(checkForErrors),
        // Pass values to computed() on the computed observable
        map(result => computed(...result))
      );
    }

    // This is a base observable
    const { id, path } = schemaInstance;
    if (this._schemaSubscribers[path] === undefined) this._schemaSubscribers[path] = 0;
    const subject = new ReplaySubject(1);
    set(this._subjects, obsPath, subject);
    // Handle initial value if cached result from multicall exists
    if (this._multicallResultCache[obsPath] !== undefined)
      this._handleResult(subject, obsPath, this._multicallResultCache[obsPath]);

    // Create base observable
    const observable = Observable.create(observer => {
      this._totalSchemaSubscribers++;
      log2(`Observer subscribed to ${id} (${this._schemaSubscribers[path] + 1} subscribers)`);
      // If first subscriber to this schema add it to multicall
      if (++this._schemaSubscribers[path] === 1) this._addSchemaToMulticall(schemaInstance);
      // Subscribe to watcher updates and emit them to subjects
      if (!this._watcherUpdates) this._subscribeToWatcherUpdates();
      // Subscribe this observer to the subject for this base observable
      const sub = subject.subscribe(observer);
      // Return the function to call when this observer unsubscribes
      return () => {
        this._totalSchemaSubscribers--;
        // If last unsubscriber from this schema remove it from multicall
        if (--this._schemaSubscribers[path] === 0)
          this._removeSchemaFromMulticall(schemaInstance.id);
        // Unsubscribe this observer from the subject for this base observable
        sub.unsubscribe();
        log2(`Observer unsubscribed from ${id} (${this._schemaSubscribers[path]} subscribers)`); // prettier-ignore
      };
    });

    log2(`Created new base observable: ${obsPath}`);
    set(this._observables, obsPath, observable);
    return observable;
  }

  _createSchemaInstance(schemaDefinition, ...args) {
    const path = args.join('.');
    const instancePath = `${schemaDefinition.key}${path ? '.' : ''}${path}`;

    // Return existing schema if found for this instance path (schema key + args)
    if (this._schemaInstances[instancePath]) return this._schemaInstances[instancePath];

    // Generate schema instance
    const schemaInstance = schemaDefinition.generate(...args);
    this._schemaInstances[instancePath] = schemaInstance;
    schemaInstance.args = [...args];

    // Auto generate some fields if this is a base schema
    if (!schemaInstance.computed) {
      const { returns, transforms = {} } = schemaInstance;
      schemaInstance.path = instancePath;
      // Auto generate return keys for schema instance if not provided by generate()
      if (!returns) {
        schemaInstance.returns = schemaDefinition.returns.map(ret => {
          const key = ret[0];
          const fullPath = `${key}${path ? '.' : ''}${path}`;
          return transforms[key]
            ? [fullPath, transforms[key]] // Use transform mapping in generated schema instance if available
            : ret.length == 2
            ? [fullPath, ret[1]]
            : [fullPath];
        });
      }
      // Resolve target contract address if contract string is provided
      const { target, contract } = schemaInstance;
      if (!target && !contract) throw new Error('Schema must specify target address or contract');
      if (!target && !this._addresses[contract]) throw new Error(`Can't find contract address for ${contract}`); // prettier-ignore
      schemaInstance.target = target || this._addresses[contract];
    }

    return schemaInstance;
  }

  _addSchemaToMulticall(schemaInstance) {
    const { id, target, call, returns } = schemaInstance;
    // If schema already added but pending removal then cancel pending removal
    if (this._removeSchemaTimers[id]) {
      log2(`Cancelled pending schema removal: ${id}`);
      clearTimeout(this._removeSchemaTimers[id]);
      delete this._removeSchemaTimers[id];
      return;
    }
    this._totalActiveSchemas++;
    this._watcher.tap(calls => [
      ...calls,
      {
        id,
        target,
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
    // If there are no active schemas unsubscribe from watcher updates
    if (--this._totalActiveSchemas === 0) {
      log2('No remaining active schemas');
      log2('Unsubscribed from watcher updates');
      this._watcherUpdates.unsub();
      this._watcherUpdates = null;
    } else {
      if (process?.browser) log2('Active schemas (' + this._totalActiveSchemas + ' total):', this.activeSchemaIds);
      else log2(`Active schemas (${this._totalActiveSchemas} remaining): ${this.activeSchemaIds.join(',')}`); // prettier-ignore
    }
  }

  _removeSchemaFromMulticall(id) {
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

  _handleResult(subject, obsPath, value) {
    const err = this._validateResult(subject, obsPath, value);
    // Trigger error on observable or emit result value to observable
    if (err) subject.error(err);
    else subject.next(value);
  }

  _validateResult(subject, obsPath, value) {
    let [observableKey, ...args] = obsPath.split('.');
    const schemaDefinition = this._schemaByObservableKey[observableKey];
    const instancePath = `${schemaDefinition.key}${args.length > 0 ? '.' : ''}${args.join('.')}`;
    const schemaInstance = this._schemaInstances[instancePath];
    // Pass validation if no validator found for this schema definition
    if (!schemaDefinition.validate?.hasOwnProperty(observableKey)) return;
    try {
      // Call validation func on schema definition for result value and pass schema instance args
      // as 2nd param and also this context
      const validate = schemaDefinition.validate[observableKey].call(
        { args: schemaInstance.args },
        value,
        schemaInstance.args
      );
      if (validate) throw new Error(validate);
      return; // Pass validation
    } catch (err) {
      log2('Validation error for ' + obsPath + ' result:', value);
      return err; // Fail validation
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
        this._handleResult(subject, update.type, update.value);
      } else this._multicallResultCache[update.type] = update.value;
    });
  }
}
