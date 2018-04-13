import PrivateService from '../core/PrivateService';
import SmartContractService from './SmartContractService';
import EthereumTokenService from './EthereumTokenService';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';
import TransactionObject from './TransactionObject';
import Cdp from './Cdp';

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
    return new Cdp(this).transactionObject();
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
    ]).then(() => wethToken.deposit(parsedAmount), ethersProvider);
  }

  lockEth(cdpId, eth) {
    const contract = this.get('smartContract'),
      tubContract = contract.getContractByName(contracts.TUB),
      ethersUtils = contract.get('web3').ethersUtils(),
      ethersProvider = contract.get('web3').ethersProvider();

    return this.convertEthToPeth(eth).then(conversionTxn => {
      return conversionTxn.onMined().then(() => {
        const hexCdpId = contract.numberToBytes32(cdpId);
        const parsedAmount = ethersUtils.parseEther(eth);
        const lockTxn = new TransactionObject(
          tubContract.lock(hexCdpId, parsedAmount),
          ethersProvider
        ); // solidity code: function lock(bytes32 cup, uint wad) public note

        return lockTxn;
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
