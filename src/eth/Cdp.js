import contracts from '../../contracts/contracts';
import { utils as ethersUtils } from 'ethers';

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
    this._emitterInstance = this._cdpService.get('event').buildEmitter();
    this.on = this._emitterInstance.on;
    this._emitterInstance.registerPollEvents({
      COLLATERAL: {
        USD: () => this.getCollateralValueInUSD(),
        ETH: () => this.getCollateralValueInEth()
      },
      DEBT: {
        dai: () => this.getDebtValueInDai()
      }
    });
  }

  _captureCdpIdPromise(tubContract) {
    const ethersSigner = this._smartContractService.get('web3').ethersSigner();

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

  getId() {
    return this._cdpIdPromise;
  }
}

// each of these methods just calls the method of the same name on the service
// with the cdp's id as the first argument
const passthroughMethods = [
  'bite',
  'drawDai',
  'freePeth',
  'getCollateralValueInEth',
  'getCollateralValueInPeth',
  'getCollateralValueInUSD',
  'getCollateralizationRatio',
  'getDebtValueInDai',
  'getDebtValueInUSD',
  'getMkrFeeInUSD',
  'getMkrFeeInMkr',
  'getInfo',
  'getLiquidationPriceEthUSD',
  'give',
  'isSafe',
  'lockEth',
  'lockPeth',
  'lockWeth',
  'shut',
  'wipeDai'
];

Object.assign(
  Cdp.prototype,
  passthroughMethods.reduce((acc, name) => {
    const newName = name.replace('Value', '');
    acc[name] = async function(...args) {
      return this._cdpService[newName](await this.getId(), ...args);
    };
    return acc;
  }, {})
);
