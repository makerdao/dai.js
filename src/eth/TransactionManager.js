import PublicService from '../core/PublicService';
import TransactionObject from './TransactionObject';
import ObjectWrapper from '../utils/ObjectWrapper';

let txId = 1;

export default class TransactionManager extends PublicService {
  constructor(name = 'transactionManager') {
    super(name, ['web3', 'log']);
    this._transactions = [];
    this._listeners = [];
  }

  // FIXME: having a method that returns one thing when it's called in a promise
  // chain and something else when it's not (besides a promise that resolves to
  // the first thing) makes it pretty difficult to work with.
  createHybridTx(tx, { businessObject, parseLogs, metadata } = {}) {
    if (tx._original) {
      console.warn('Redundant call to createHybridTx');
      return tx;
    }

    const txo = new TransactionObject(
      tx,
      this.get('web3'),
      businessObject,
      parseLogs
    );

    const hybrid = txo.mine().then(() => txo.onMined());
    Object.assign(hybrid, {
      _original: txo,
      getOriginalTransaction: () => txo,
      _txId: txId++,
      metadata // put whatever you want in here for inspecting/debugging
    });

    if (businessObject) {
      ObjectWrapper.addWrapperInterface(hybrid, businessObject);
    }

    ObjectWrapper.addWrapperInterface(hybrid, txo, [
      'logs',
      'hash',
      'fees',
      'timeStamp',
      'timeStampSubmitted'
    ]);

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
}
