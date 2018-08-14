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
  createTransactionHybrid(
    contractTransaction,
    businessObject = null,
    parseLogs = null
  ) {
    // do nothing if it's already a transaction object
    if (contractTransaction._original) return contractTransaction;

    const tx = new TransactionObject(
      contractTransaction,
      this.get('web3'),
      businessObject,
      parseLogs
    );

    const hybrid = tx.mine().then(() => tx.onMined());
    hybrid._original = tx;
    hybrid.getOriginalTransaction = () => tx;
    hybrid._txId = txId++;

    if (businessObject) {
      ObjectWrapper.addWrapperInterface(hybrid, businessObject);
    }

    ObjectWrapper.addWrapperInterface(hybrid, tx, [
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
