import PrivateService from '../core/PrivateService';
import EthereumTokenService from '../eth/EthereumTokenService';
import SmartContractService from './SmartContractService';
import TransactionManager from './TransactionManager';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';

import { utils } from 'ethers';
import util from 'ethereumjs-util';

export default class PriceFeedService extends PrivateService {
  static buildTestService(suppressOutput = true) {
    const service = new PriceFeedService();
    const tokenService = EthereumTokenService.buildTestService();
    const smartContractService = SmartContractService.buildTestService(
      null,
      suppressOutput
    );
    const transactionManager = TransactionManager.buildTestService(
      smartContractService.get('web3')
    );

    service
      .manager()
      .inject('token', tokenService)
      .inject('smartContract', smartContractService)
      .inject('transactionManager', transactionManager);

    return service;
  }

  /**
   * @param {string} name
   */

  constructor(name = 'priceFeed') {
    super(name, ['token', 'smartContract', 'transactionManager']);
  }

  _tubContract() {
    return this.get('smartContract').getContractByName(contracts.SAI_TUB);
  }

  _transactionManager() {
    return this.get('transactionManager');
  }

  _toEthereumFormat(value) {
    return util.bufferToHex(
      util.setLengthLeft(
        utils.hexlify(
          this.get('token')
            .getToken(tokens.WETH)
            .toEthereumFormat(value)
        ),
        32
      )
    );
  }

  _toUserFormat(value) {
    return this.get('token')
      .getToken(tokens.WETH)
      .toUserFormat(value);
  }

  getEthPrice() {
    return this.get('smartContract')
      .getContractByName(contracts.SAI_PIP)
      .read()
      .then(price => this._toUserFormat(price));
  }

  setEthPrice(newPrice) {
    const adjustedPrice = this._toEthereumFormat(newPrice);

    return this._transactionManager().createTransactionHybrid(
      this.get('smartContract')
        .getContractByName(contracts.SAI_PIP)
        .poke(adjustedPrice)
    );
  }
}
