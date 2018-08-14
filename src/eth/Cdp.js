import contracts from '../../contracts/contracts';
import { utils as ethersUtils } from 'ethers';
import { USD } from './Currency';

export default class Cdp {
  constructor(cdpService, cdpId = null) {
    this._cdpService = cdpService;
    this._smartContractService = this._cdpService.get('smartContract');
    this._transactionManager = this._smartContractService.get(
      'transactionManager'
    );
    if (cdpId === null) {
      this._cdpIdPromise = this._newCdpPromise();
    } else {
      this._cdpIdPromise = Promise.resolve(cdpId);
    }
    this._emitterInstance = this._cdpService.get('event').buildEmitter();
    this.on = this._emitterInstance.on;
    this._emitterInstance.registerPollEvents({
      COLLATERAL: {
        USD: () => this.getCollateralValue(USD),
        ETH: () => this.getCollateralValue()
      },
      DEBT: {
        dai: () => this.getDebtValue()
      }
    });
  }

  _captureCdpIdPromise(tubContract) {
    const ethersSigner = this._smartContractService.get('web3').ethersSigner();

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
    const tubContract = this._smartContractService.getContractByName(
      contracts.SAI_TUB,
      { hybrid: false }
    );
    const captureCdpIdPromise = this._captureCdpIdPromise(tubContract);
    const contractPromise = tubContract.open();
    this._transactionObject = this._transactionManager.createHybridTx(
      contractPromise,
      {
        businessObject: this,
        metadata: { contract: contracts.SAI_TUB, method: 'open' }
      }
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
  'getCollateralValue',
  'getCollateralizationRatio',
  'getDebtValue',
  'getGovernanceFee',
  'getInfo',
  'getLiquidationPrice',
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
    acc[name] = async function(...args) {
      return this._cdpService[name](await this.getId(), ...args);
    };
    return acc;
  }, {})
);
