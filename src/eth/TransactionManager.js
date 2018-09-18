import PublicService from '../core/PublicService';
import TransactionObject from './TransactionObject';
import { Contract } from 'ethers';
import { dappHub } from '../../contracts/abi';

let txId = 1;

export default class TransactionManager extends PublicService {
  constructor(name = 'transactionManager') {
    super(name, ['web3', 'log', 'nonce']);
    this._transactions = [];
    this._listeners = [];
  }

  formatHybridTx(contract, method, args, name, businessObject = null) {
    if (!args) args = [];
    let options,
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
    } else {
      options = {};
    }

    return this.createHybridTx(
      // this async immediately-executed function wrapper is necessary to ensure
      // that the hybrid tx gets wrapped around the async operation that gets
      // the nonce. if we were to await outside of the wrapper, it would cause
      // `formatHybridTx` to return a promise that resolved to the hybrid,
      // instead of the hybrid itself, and then the hybrid's lifecycle hooks
      // wouldn't be accessible.
      (async () =>
        this._execute(contract, method, args, {
          ...this.get('web3').transactionSettings(),
          ...options,
          nonce: await this.get('nonce').getNonce()
        }))(),
      { businessObject, metadata }
    );
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

    const hybrid = txo.mine().then(() => txo.onMined());
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
