import PublicService from '../core/PublicService';
import TransactionObject from './TransactionObject';
import { Contract } from 'ethers';
import { dappHub } from '../../contracts/abis';
import { uniqueId } from '../utils';
import { has } from 'lodash';
import debug from 'debug';
const log = debug('dai:testing:txMgr');

export default class TransactionManager extends PublicService {
  constructor(name = 'transactionManager') {
    super(name, ['web3', 'log', 'nonce']);
    this._listeners = [];
    this._tracker = new Tracker();
  }

  formatHybridTx(contract, method, args, name, businessObject) {
    if (!args) args = [];
    let options,
      promiseToTrack,
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
        if (options.promise) {
          promiseToTrack = options.promise;
        } else {
          log('hmm. promise is set but falsy');
        }
        delete options.promise;
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
        ...this.get('web3').transactionSettings(),
        ...options,
        nonce: await this.get('nonce').getNonce()
      }))();

    return this.createHybridTx(innerTx, {
      businessObject,
      metadata,
      promise: promiseToTrack
    });
  }

  sendTx(data, options) {
    const innerTx = (async () => {
      const hash = await this.get('web3').eth.sendTransaction({
        ...data,
        ...this.get('web3').transactionSettings(),
        nonce: await this.get('nonce').getNonce()
      });
      return { hash };
    })();

    return this.createHybridTx(innerTx, options);
  }

  // FIXME: this should be renamed, because it no longer creates a hybrid
  createHybridTx(tx, { businessObject, metadata, promise } = {}) {
    const txo = new TransactionObject(tx, this.get('web3'), this.get('nonce'), {
      businessObject,
      metadata
    });

    this._listeners.forEach(cb => cb(txo));

    const minePromise = txo.mine();
    const key = uniqueId(promise || minePromise);

    // log(
    //   `${metadata.contract}.${metadata.method}: ${key}` +
    //     `${promise ? ' | passed promise' : ''}`
    // );

    this._tracker.store(key, txo);
    return minePromise;
  }

  onNewTransaction(callback) {
    this._listeners.push(callback);
  }

  getTransaction(promise, label) {
    return this._tracker.get(uniqueId(promise), label);
  }

  async confirm(promise, label, count) {
    await promise;
    const tx = this._tracker.get(uniqueId(promise), label);
    return tx.confirm(count);
  }

  isMined(promise) {
    return this._tracker.get(uniqueId(promise)).isMined();
  }

  listen(promise, handlers) {
    this._tracker.listen(uniqueId(promise), handlers);
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

class Tracker {
  static states = ['pending', 'mined', 'finalized', 'error'];

  constructor() {
    this._listeners = {};
    this._transactions = {};
  }

  store(key, tx) {
    this._init(key);
    this._transactions[key].push(tx);

    for (let event of this.constructor.states) {
      tx.on(event, () => this._listeners[key][event].forEach(cb => cb(tx)));
    }
  }

  listen(key, handlers) {
    this._init(key);

    for (let state in handlers) {
      const cb = handlers[state];
      if (state === 'confirmed') state = 'finalized';
      this._listeners[key][state].push(cb);

      // if event has already happened, call handler immediately
      this._transactions[key].forEach(
        tx => tx && tx.inOrPastState(state) && cb(tx)
      );
    }
  }

  trigger(key, event) {
    for (let cb of this._listeners[key][event]) {
      cb(this._transactions[key]);
    }
  }

  get(key, label) {
    const txs = this._transactions[key];
    if (!txs || txs.length === 0) {
      throw new Error(`No transactions for key ${key}`);
    }
    if (txs.length > 1) {
      // TODO
      console.warn(`label not implemented yet (received label "${label}")`);
    }
    return txs[0];
  }

  _init(key) {
    if (!this._transactions[key]) this._transactions[key] = [];
    if (!this._listeners[key]) {
      this._listeners[key] = this.constructor.states.reduce((acc, state) => {
        acc[state] = [];
        return acc;
      }, {});
    }
  }
}
