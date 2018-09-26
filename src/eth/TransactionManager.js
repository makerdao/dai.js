import PublicService from '../core/PublicService';
import TransactionObject from './TransactionObject';
import { Contract } from 'ethers';
import { dappHub } from '../../contracts/abis';
import { uniqueId } from '../utils';
import { has } from 'lodash';
import debug from 'debug';
const log = debug('dai:testing');

let txId = 1;

// decorator definition
export function tracksTransactions(target, name, descriptor) {
  const original = descriptor.value;
  descriptor.value = function(...args) {
    const lastArg = args[args.length - 1];
    let options;
    if (typeof lastArg === 'object' && lastArg.constructor === Object) {
      args = args.slice(0, args.length - 1);
      options = lastArg;
    } else {
      options = {};
    }

    const promise = (async () => {
      // this "no-op await" is necessary for the inner reference to the
      // outer promise to become valid
      await 0;

      options.promise = promise;
      const newArgs = [...args, options];
      const inner = original.apply(this, newArgs);
      log(`inner reference to wrapper promise: ${uniqueId(promise)}`);
      return inner;
    })();

    log(`wrapper promise: ${uniqueId(promise)}`);
    return promise;
  };
  return descriptor;
}

export default class TransactionManager extends PublicService {
  constructor(name = 'transactionManager') {
    super(name, ['web3', 'log', 'nonce']);
    this._transactions = [];
    this._listeners = [];
    this._trackedPromises = {};
  }

  formatHybridTx(contract, method, args, name, businessObject = null) {
    if (!args) args = [];
    let options,
      promiseToTrack,
      txLabel,
      metadata = {
        contract: name,
        method: method.replace(/\(.*\)$/g, ''),
        args
      },
      lastArg = args[args.length - 1];

    if (typeof lastArg === 'object' && lastArg.constructor === Object) {
      options = lastArg;
      args = args.slice(0, args.length - 1);

      // append additional metadata to the default values.
      if (options.metadata) {
        metadata = { ...metadata, ...options.metadata };
        delete options.metadata;
      }

      if (has(options, 'promise')) {
        if (!options.promise) {
          throw new Error('promise is set but falsy?!');
        }
        promiseToTrack = options.promise;
        delete options.promise;
      }

      if (options.txLabel) {
        txLabel = options.txLabel;
        delete options.txLabel;
      }
    } else {
      options = {};
    }

    // this async immediately-executed function wrapper is necessary to ensure
    // that the hybrid tx gets wrapped around the async operation that gets
    // the nonce. if we were to await outside of the wrapper, it would cause
    // `formatHybridTx` to return a promise that resolved to the hybrid,
    // instead of the hybrid itself, and then the hybrid's lifecycle hooks
    // wouldn't be accessible.
    const innerTx = (async () =>
      this._execute(contract, method, args, {
        ...options,
        ...this.get('web3').transactionSettings(),
        nonce: await this.get('nonce').getNonce()
      }))();

    const hybrid = this.createHybridTx(innerTx, { businessObject, metadata });

    const key = this._getKeyForPromise(promiseToTrack || hybrid);
    log(
      `tracking ${name}.${method},` +
        `${promiseToTrack ? ' passed promise,' : ''}` +
        `${txLabel ? ` labeled "${txLabel}",` : ''} with id ${key}`
    );

    if (txLabel) {
      if (!this._trackedPromises[key]) {
        this._trackedPromises[key] = {};
      }
      this._trackedPromises[key][txLabel] = hybrid;
    } else {
      if (this._trackedPromises[key]) {
        log('Uh oh! Collision without label.');
      }
      this._trackedPromises[key] = hybrid;
    }

    return hybrid;
  }

  createHybridTx(tx, { businessObject, parseLogs, metadata } = {}) {
    if (tx._original) {
      console.warn('Redundant call to createHybridTx');
      return tx;
    }

    const txo = new TransactionObject(
      tx,
      this.get('web3'),
      this.get('nonce'),
      businessObject,
      parseLogs
    );

    const hybrid = txo.mine();
    Object.assign(
      hybrid,
      {
        _original: txo,
        getOriginalTransaction: () => txo,
        _txId: txId++,
        metadata // put whatever you want in here for inspecting/debugging
      },
      [
        'mine',
        'confirm',
        'state',
        'isPending',
        'isMined',
        'isFinalized',
        'isError',
        'onPending',
        'onMined',
        'onFinalized',
        'onError'
      ].reduce((acc, method) => {
        acc[method] = (...args) => txo[method](...args);
        return acc;
      }, {})
    );

    this._transactions.push(hybrid);
    this._listeners.forEach(cb => cb(hybrid));

    return hybrid;
  }

  getTransactions() {
    return this._transactions;
  }

  onNewTransaction(callback) {
    this._listeners.push(callback);
  }

  getTx(promise, label) {
    const key = this._getKeyForPromise(promise);
    const ret = this._trackedPromises[key];
    if (!ret) {
      throw new Error(`Promise with id ${key} has no transactions.`);
    }
    log(`getTx for ${key}, ${label || 'no label'}: ${!!ret}`);
    return label ? ret[label] : ret;
  }

  async confirm(promise, label, count) {
    await promise;
    return this.getTx(promise, label).confirm(count);
  }

  _getKeyForPromise(promise) {
    return uniqueId(promise);
  }

  // if options.dsProxyAddress is set, execute this contract method through the
  // proxy contract at that address.
  _execute(contract, method, args, options) {
    if (!options.dsProxyAddress) return contract[method](...args, options);

    const dsProxyAddress = options.dsProxyAddress;
    delete options.dsProxyAddress;

    this.get('log').debug(`Calling ${method} vis DSProxy at ${dsProxyAddress}`);
    const dsProxyContract = new Contract(
      dsProxyAddress,
      dappHub.dsProxy,
      this.get('web3')
        .ethersProvider()
        .getSigner()
    );

    const data = contract.interface.functions[method](...args).data;
    return dsProxyContract.execute(contract.address, data, options);
  }
}
