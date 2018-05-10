import contracts from '../../contracts/contracts';

export default class Cdp {
  constructor(cdpService, cdpId = null) {
    this._cdpService = cdpService;
    this._transactionManager = this._cdpService.get('transactionManager');
    this._smartContractService = this._cdpService.get('smartContract');
    if (cdpId === null) {
      this._cdpIdPromise = this._newCdpPromise();
    } else {
      this._cdpIdPromise = Promise.resolve(cdpId);
    }
  }

  _captureCdpIdPromise(tubContract) {
    const ethersSigner = this._smartContractService.get('web3').ethersSigner();
    const ethersUtils = this._smartContractService.get('web3').ethersUtils();

    return new Promise(resolve => {
      // Event handlers need to be registered on the inner Ethers.js contract, for now
      tubContract._original.onlognewcup = function(address, cdpIdBytes32) {
        if (ethersSigner.address.toLowerCase() == address.toLowerCase()) {
          const cdpId = ethersUtils.bigNumberify(cdpIdBytes32).toNumber();
          this.removeListener();
          resolve(cdpId);
        }
      };
    });
  }

  _newCdpPromise() {
    const tubContract = this._smartContractService.getContractByName(
      contracts.SAI_TUB
    );
    const captureCdpIdPromise = this._captureCdpIdPromise(tubContract);
    const contractPromise = tubContract.open();
    this._transactionObject = this._transactionManager.createTransactionHybrid(
      contractPromise,
      this
    );

    return Promise.all([captureCdpIdPromise, contractPromise]).then(
      result => result[0]
    );
  }

  transactionObject() {
    return this._transactionObject;
  }

  getCdpId() {
    return this._cdpIdPromise;
  }

  shut() {
    return this.getCdpId().then(id => this._cdpService.shutCdp(id));
  }

  getInfo() {
    return this.getCdpId().then(id => this._cdpService.getCdpInfo(id));
  }

  lockEth(eth) {
    return this.getCdpId().then(id => this._cdpService.lockEth(id, eth));
  }

  drawDai(amount) {
    return this.getCdpId().then(id => this._cdpService.drawDai(id, amount));
  }
}
