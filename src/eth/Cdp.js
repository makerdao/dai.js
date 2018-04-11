import TransactionObject from './TransactionObject';
import contracts from '../../contracts/contracts';

export default class Cdp {
  constructor(smartContractService, cdpId = null) {
    this._service = smartContractService;
    if (cdpId === null) {
      this._cdpIdPromise = this._newCdpPromise();
    } else {
      this._cdpIdPromise = Promise.resolve(cdpId);
    }
  }

  _captureCdpIdPromise(tubContract) {
    const ethersSigner = this._service.get('web3').ethersSigner();
    const ethersUtils = this._service.get('web3').ethersUtils();

    return new Promise(resolve => {
      tubContract.onlognewcup = function(address, cdpIdBytes32) {
        if (ethersSigner.address.toLowerCase() == address.toLowerCase()) {
          const cdpId = ethersUtils.bigNumberify(cdpIdBytes32).toNumber();
          this.removeListener();
          resolve(cdpId);
        }
      };
    });
  }

  _newCdpPromise() {
    const tubContract = this._service.getContractByName(contracts.TUB);

    return Promise.all([
      this._captureCdpIdPromise(tubContract),
      tubContract.open()
    ]).then(result => result[0]);
  }

  getCdpId() {
    return this._cdpIdPromise;
  }

  shut() {
    return new TransactionObject(
      this._service.shutCdp(this._id),
      this._ethersProvider
    );
  }

  getInfo() {
    return this._service.getCdpInfo(this._id);
  }

  convertEthToPeth(eth) {
    return new TransactionObject(
      this._service.convertEthToPeth(eth),
      this._ethersProvider
    );
  }
}
