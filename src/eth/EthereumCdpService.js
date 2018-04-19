import PrivateService from '../core/PrivateService';
import SmartContractService from './SmartContractService';
import EthereumTokenService from './EthereumTokenService';
import TokenConversionService from './TokenConversionService';
import contracts from '../../contracts/contracts';
import TransactionObject from './TransactionObject';
import Cdp from './Cdp';
import tokens from '../../contracts/tokens';

import { utils } from 'ethers';

export default class EthereumCdpService extends PrivateService {
  static buildTestService() {
    const service = new EthereumCdpService();
    const tokenService = EthereumTokenService.buildTestService();
    const smartContract = SmartContractService.buildTestService();
    const conversionService = TokenConversionService.buildTestService();

    service
      .manager()
      .inject('smartContract', smartContract)
      .inject('token', tokenService)
      .inject('conversionService', conversionService);

    return service;
  }

  /**
   * @param {string} name
   */
  constructor(name = 'cdp') {
    super(name, ['smartContract', 'token', 'conversionService']);
  }

  openCdp() {
    return new Cdp(this).transactionObject();
  }

  lockEth(cdpId, eth) {
    const contract = this.get('smartContract'),
      tubContract = contract.getContractByName(contracts.TUB),
      conversionService = this.get('conversionService'),
      ethersProvider = contract.get('web3').ethersProvider(),
      hexCdpId = contract.numberToBytes32(cdpId),
      parsedAmount = conversionService._parseDenomination(eth);

    return conversionService.convertEthToPeth(eth).then(() => {
      return new TransactionObject(
        tubContract.lock(hexCdpId, parsedAmount),
        ethersProvider
      );
    });
  }

  drawDai(cdpId, amount) {
    const contract = this.get('smartContract'),
      tubContract = contract.getContractByName(contracts.TUB),
      ethersUtils = contract.get('web3').ethersUtils(),
      ethersProvider = contract.get('web3').ethersProvider();

    const hexCdpId = contract.numberToBytes32(cdpId);
    const parsedAmount = ethersUtils.parseEther(amount);

    //cdp must have peth locked inside it
    return tubContract
      .draw(hexCdpId, parsedAmount)
      .then(transaction => ethersProvider.waitForTransaction(transaction.hash))
      .then(() => {
        // eslint-disable-next-line
        this.getCdpInfo(cdpId).then(result => console.log(result));
      });
  }

  shutCdp(cdpId) {
    const contract = this.get('smartContract'),
      tubContract = contract.getContractByName(contracts.TUB),
      hexCdpId = contract.numberToBytes32(cdpId),
      owner = contract.get('web3').defaultAccount(),
      token = this.get('token').getToken(tokens.PETH);

    return token.balanceOf(owner).then(balance => {
      if (parseFloat(utils.formatEther(balance)) > 0) {
        this.get('conversionService')
          ._approveToken(token)
          .onPending();
        return tubContract.shut(hexCdpId);
      } else {
        return tubContract.shut(hexCdpId);
      }
    });
  }

  getCdpInfo(cdpId) {
    const contract = this.get('smartContract'),
      tubContract = contract.getContractByName(contracts.TUB),
      hexCdpId = contract.numberToBytes32(cdpId);

    return tubContract.cups(hexCdpId);
  }
}
