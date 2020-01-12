import { PublicService } from '@makerdao/services-core';
import { createWatcher } from '@makerdao/multicall';
import debug from 'debug';
import { ReplaySubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import merge from 'lodash/merge';
import get from 'lodash/get';

const LOGICAL = 'logical';
const DERIVED = 'derived';

const log = debug('dai:MulticallService');

export default class MulticallService extends PublicService {
  constructor(name = 'multicall') {
    super(name, ['web3', 'smartContract']);

    this._rootSubscription = null;

    /*
     * The rootObservable is the data sink for all multicall data. Observables
     * for individual multicall data, pipe a filter to match the corresponding
     * identification key, i.e MCD_VAT.{vaultId}.ink,
     */
    this._rootObservable = new ReplaySubject();

    /*
     * The observable store is a store of observables keyed by the
     * "observableKeys" entry in a given schema. An observable may be nested
     * multiple layers dependent on the complexity of the called function.
     * For example, the observable produced for the "debtScalingFactor"
     * of a given ilk is stored as:
     *
     * {
     *   debtScalingFactor: { [ilkName]: debtScalingFactor$ }
     * }
     *
     */
    this.observableStore = {};

    /*
     * Cache containing unregistered observable schemas keyed by logical schemas
     * which are not yet existing in the observable store at the time of
     * registration
     */
    this._unregisteredObservables = {};
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

  startObservable() {
    if (this._watcher === undefined) throw new Error('watcher is not defined');

    if (this._rootSubscription === null) {
      log('Initialising multicall data flow through root observable');
      this._rootSubcription = this._watcher.subscribe(updates => {
        this._rootObservable.next(updates);
      });
    }
    return this._rootObservable;
  }

  getObservable(pathString) {
    return get(this.observableStore, pathString);
  }

  destructureContractCall(call) {
    const [callFnName, callTypes, returnTypes] = call
      .split('(')
      .map(s => {
        if (s[s.length - 1] === ')') return s.substring(0, s.length - 1);
        else return s;
      })
      .map(s => s.split(','))
      .map(s => {
        if (Array.isArray(s)) return s.filter(x => x !== '');
        else return s;
      });

    if (returnTypes.length < 1)
      throw new Error(
        'Invalid contract call specified, call must return at least one argument'
      );

    return { callFnName, callTypes, returnTypes };
  }

  _registerLogicalSchema({
    contractName,
    contractCall,
    callArgs,
    callArgsOverrides,
    returnKeys,
    observableKeys
  }) {
    let addresses = this.get('smartContract').getContractAddresses();
    addresses.MDAI = addresses.MCD_DAI;
    addresses.MWETH = addresses.ETH;

    /*
     * destructureContractCall enables us to extract the name of the function as
     * defined in the schema.
     */
    const { callFnName, callTypes, returnTypes } = this.destructureContractCall(
      contractCall
    );

    if (callTypes.length !== callArgs.length)
      throw new Error(
        `Invalid contract call specified, number of call types, ${callTypes} does not match number of call arguments, ${callArgs}`
      );

    if (returnTypes.length !== returnKeys.length)
      throw new Error(
        `Invalid contract call specified, number of return types, ${returnTypes} does not match number of return arguments, ${returnKeys}`
      );

    /*
     * By default, the callKeyStructure is defined by the contract name, the function name
     * to be called and the "callArgsIdentifiers, interleaved by '.' easy parsing.
     *
     * The "callArgsIdentifiers" can be either the passed arguments to the contract call or
     * multiple overrides for custom granularity
     */
    const callArgsIdentifiers = callArgsOverrides
      ? callArgsOverrides.join('.')
      : callArgs.map(a => a[0]).join('.');

    const callKeyStructure = `${contractName}.${callFnName}${
      callArgsIdentifiers.length > 0 ? `.${callArgsIdentifiers}` : ''
    }`;

    const processedCallArgs = callArgs.map(([arg, cb]) => {
      if (cb === undefined) return arg;
      return cb(arg);
    });

    /*
     * Return values and their callbacks are constructed here
     */
    const processedReturnKeys = returnKeys.map(([k, cb]) =>
      [`${callKeyStructure}.${k}`, cb].filter(x => x)
    );

    /*
     * For each return value specified in processedReturnKeys, an observable
     * will be created which filters on that return value piped from the
     * root observable.
     *
     * When created an object is created nesting the observable as specified by
     * the corresponding observableKey array to that return value. This object is
     * merged into the observableStore
     *
     * Finally, a check is ran on the unregisteredObservables cache to check if
     * this newly added logical observable is a dependency to a derived observable.
     * If one is found, the derived observable is re-registerd
     */
    observableKeys.forEach((item, idx) => {
      const multicallFilterKey = processedReturnKeys[idx][0];
      const filteredObservable = this._rootObservable.pipe(
        filter(({ type }) => type === multicallFilterKey),
        map(({ value }) => value)
      );

      const entry = item.reduceRight(
        (obj, elem) => ({ [elem]: obj }),
        filteredObservable
      );

      this.observableStore = merge({}, this.observableStore, entry);

      // check if added observable is a dependency of an unregisterd observable
      Object.entries(this._unregisteredObservables).map(
        ([dependency, args]) => {
          if (dependency === item.join('.')) {
            this._registerDerivedSchema(args);
          }
        }
      );
    });

    /*
     * Call is tapped to multicall
     */
    this._watcher.tap(calls => [
      ...calls,
      {
        target: addresses[contractName],
        call: [contractCall, ...processedCallArgs],
        returns: [...processedReturnKeys]
      }
    ]);
  }

  _registerDerivedSchema({ observableKeys, dependencies, fn }) {
    /*
     * First checks if the dependent observables exist in the observable store
     */
    const dependentObservables = dependencies.map(
      d => d && this.getObservable(d.join('.'))
    );

    const allDependentObservablesExist = !dependentObservables.some(
      x => !!x === false
    );

    /*
     * If all observables exist, construct the new observable by passing in
     * the dependent observables to the 'fn' callback. Also removes any
     * dependency entries from the unregisterdObservables cache if the existed
     * before
     */
    if (allDependentObservablesExist) {
      dependencies.forEach(d => {
        const keyString = d.join('.');
        if (!!this._unregisteredObservables[keyString]) {
          delete this._unregisteredObservables[keyString];
        }
      });

      this.observableStore = merge(
        {},
        this.observableStore,
        observableKeys.reduceRight(
          (obj, elem) => ({ [elem]: obj }),
          fn(dependentObservables)
        )
      );
    } else {
      /*
       * if the dependencies for this schema do not exist in the store
       * than this schema is added to the unregisterd cache keyed by the
       * observableKeys of each dependency
       *
       * When those dependencies are added, a check is ran on the unregistered
       * cache for schema values which are keyed by a matching observable key.
       * Schema values which match are then re ran through this function.
       */
      dependencies.forEach((d, idx) => {
        if (!dependentObservables[idx]) {
          // add the observable to the unregistered cache, keyed by the
          // missing dependency string format
          this._unregisteredObservables = merge(
            {},
            this._unregisteredObservables,
            { [d.join('.')]: { observableKeys, dependencies, fn } }
          );
        }
      });
    }
  }

  registerSchemas(schemas) {
    schemas.map(schema => {
      if (schema.type === LOGICAL) this._registerLogicalSchema(schema);
      if (schema.type === DERIVED) this._registerDerivedSchema(schema);
    });
  }

  disconnect() {
    // TODO
  }

  get watcher() {
    return this._watcher;
  }
}
