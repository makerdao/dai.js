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
  }

  createTransaction(contractTransaction, businessObject = null, implicitState = TransactionState.mined) {
    const tx = new TransactionObject(contractTransaction, this.get('web3'), businessObject),
      hybrid = this._getImplicitStatePromise(tx, implicitState);

    hybrid._original = tx;

    return hybrid;
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