import PrivateService from '../core/PrivateService';
import Web3Service from './Web3Service';
import TransactionObject from './TransactionObject';

export default class TransactionManager extends PrivateService {

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
}