import PublicService from '../core/PublicService';
import TransactionObject from './TransactionObject';
import TransactionState from './TransactionState';
import ObjectWrapper from '../utils/ObjectWrapper';

let txId = 1;

export default class TransactionManager extends PublicService {
  constructor(name = 'transactionManager') {
    super(name, ['web3', 'log']);
    this._transactions = [];
    this._listeners = [];
  }

  createTransactionHybrid(
    contractTransaction,
    businessObject = null,
    implicitState = TransactionState.mined,
    parseLogs = null
  ) {
    const tx = new TransactionObject(
        contractTransaction,
        this.get('web3'),
        businessObject,
        parseLogs
      ),
      hybrid = this._getImplicitStatePromise(tx, implicitState);

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

  _getImplicitStatePromise(transaction, state) {
    switch (state) {
      case TransactionState.pending:
        return transaction.onPending();

      case TransactionState.mined:
        return transaction.onMined();

      case TransactionState.finalized:
        return transaction.onFinalized();

      default:
        throw new Error('Invalid implicit transaction state: ' + state);
    }
  }
}
