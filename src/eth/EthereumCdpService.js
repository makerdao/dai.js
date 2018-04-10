import PrivateService from '../core/PrivateService';
import SmartContractService from './SmartContractService';
import EthereumTokenService from './EthereumTokenService';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';
import Cdp from './Cdp';
import getNewCdpId from '../utils/getNewCdpId';
import TransactionObject from './TransactionObject';

export default class EthereumCdpService extends PrivateService {
  static buildTestService() {
    const service = new EthereumCdpService();
    const tokenService = EthereumTokenService.buildTestService();
    const smartContract = SmartContractService.buildTestService();

    service
      .manager()
      .inject('smartContract', smartContract)
      .inject('token', tokenService);

    return service;
  }

  /**
   * @param {string} name
   */
  constructor(name = 'cdp') {
    super(name, ['smartContract', 'token']);
  }

  openCdp() {
    // Create new CDP object here

    // Need to get the cdp ID, so set up a event listener for the LogNewCup event
    const eventPromise = getNewCdpId(this);

    const transaction = this.get('smartContract')
      .getContractByName(contracts.TUB)
      .open();

    console.log(this);

    return new TransactionObject(transaction, this);
  }

  convertEthToPeth(eth) {
    const contract = this.get('smartContract'),
      tubContract = contract.getContractByName(contracts.TUB),
      ethersUtils = contract.get('web3').ethersUtils(),
      ethersProvider = contract.get('web3').ethersProvider(),
      tokenService = this.get('token');

    const parsedAmount = ethersUtils.parseEther(eth);
    const wethToken = tokenService.getToken(tokens.WETH);
    const pethToken = tokenService.getToken(tokens.PETH);

    return Promise.all([
      pethToken.approveUnlimited(tubContract.address),
      wethToken.approveUnlimited(tubContract.address)
    ])
      .then(() => wethToken.deposit(parsedAmount))
      .then(transaction => ethersProvider.waitForTransaction(transaction.hash))
      .then(() => pethToken.join(parsedAmount)) // TODO: have to account for the WETH/PETH ratio
      .then(transaction => {
        return transaction;
      });
  }

  lockEth(cdpId, eth) {
    const contract = this.get('smartContract'),
      tubContract = contract.getContractByName(contracts.TUB),
      ethersUtils = contract.get('web3').ethersUtils(),
      ethersProvider = contract.get('web3').ethersProvider();

    return this.convertEthToPeth(eth)
      .then(transaction => ethersProvider.waitForTransaction(transaction.hash))
      .then(() => {
        const hexCdpId = contract.numberToBytes32(cdpId);
        const parsedAmount = ethersUtils.parseEther(eth);
        return tubContract
          .lock(hexCdpId, parsedAmount) // solidity code: function lock(bytes32 cup, uint wad) public note
          .then(transaction =>
            ethersProvider.waitForTransaction(transaction.hash)
          )
          .then(() => {
            // eslint-disable-next-line
            this.getCdpInfo(cdpId).then(result => console.log(result));
          });
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
      hexCdpId = contract.numberToBytes32(cdpId);

    return tubContract.shut(hexCdpId);
  }

  getCdpInfo(cdpId) {
    const contract = this.get('smartContract'),
      tubContract = contract.getContractByName(contracts.TUB);

    const hexCdpId = contract.numberToBytes32(cdpId);
    return tubContract.cups(hexCdpId);
  }
}
