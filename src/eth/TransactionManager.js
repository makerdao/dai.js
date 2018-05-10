import PublicService from '../core/PublicService';
import Web3Service from './Web3Service';
import TransactionObject from './TransactionObject';
import TransactionState from './TransactionState';

export default class TransactionManager extends PublicService {

  static buildTestService(web3 = null) {
    web3 = web3 || Web3Service.buildTestService();
    const service = new TransactionManager();

    service.manager()
      .inject('web3', web3)
      .inject('log', web3.get('log'));

    return service;
  }

  constructor(name = 'transactionManager') {
    super(name, ['web3', 'log']);
    this._transactions = [];
  }

  createTransactionHybrid(contractTransaction, businessObject = null, implicitState = TransactionState.mined) {
    const tx = new TransactionObject(contractTransaction, this.get('web3'), businessObject),
      hybrid = this._getImplicitStatePromise(tx, implicitState);

    hybrid._original = tx;
    this._addWrapperInterface(hybrid, businessObject || {});
    this._addWrapperInterface(hybrid, tx, ['logs', 'hash', 'fees', 'timeStamp', 'timeStampSubmitted']);

    this._transactions = hybrid;
    return hybrid;
  }

  getTransactions() {
    return this._transactions;
  }

  _addWrapperInterface(wrapper, innerObject, exclude = []) {
    this._collectAllPropertyNames(innerObject, exclude).forEach(k => {
      if (k[0] === '_') {
        // do nothing
      } else if (this._isFunction(innerObject[k])) {
        wrapper[k] = (...args) => innerObject[k](...args);
      } else {
        wrapper[this._accessorName(k, 'get')] = () => innerObject[k];
        wrapper[this._accessorName(k, 'set')] = v => {
          innerObject[k] = v;
          return wrapper;
        };
      }
    });
  }

  _collectAllPropertyNames(object, exclude = []) {
    let result = Object.getOwnPropertyNames(object).filter(p => exclude.indexOf(p) < 0);

    if (object.__proto__.__proto__) {
      result = result.concat(this._collectAllPropertyNames(object.__proto__, exclude));
    }

    return result.filter(p => p !== 'constructor');
  }

  _accessorName(property, type) {
    return type + property[0].toUpperCase() +
      (property.length > 1 ? property.substr(1) : '');
  }

  _isFunction(value) {
    return value && {}.toString.call(value) === '[object Function]';
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