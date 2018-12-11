import contracts from '../../contracts/contracts';
import { USD } from './Currency';

export default class Cdp {
  constructor(cdpService, cdpId = null) {
    this._cdpService = cdpService;
    this._smartContractService = this._cdpService.get('smartContract');
    this._web3Service = this._smartContractService.get('web3');
    this._transactionManager = this._smartContractService.get(
      'transactionManager'
    );

    if (!cdpId) {
      this._create();
    } else {
      this.id = cdpId;
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

  _create() {
    // Contract created using web3provider engine
    const tubContract = this._smartContractService.getContractByName(
      contracts.SAI_TUB
    );

    const getId = open => {
      const txObj = this._transactionManager.getTransaction(open);
      return new Promise(resolve => {
        txObj.onMined(() => {
          const log = txObj.receipt.logs[1];
          resolve(this._web3Service._web3.utils.hexToNumber(log.data));
        });
      });
    };

    const promise = (async () => {
      await 0;
      const open = tubContract.open({
        metadata: {
          action: {
            name: 'open'
          }
        },
        promise
      });
      this.id = await getId(open);
      return this;
    })();

    this._transactionObject = promise;
  }

  transactionObject() {
    return this._transactionObject;
  }
}

// each of these methods just calls the method of the same name on the service
// with the cdp's id as the first argument
const passthroughMethods = [
  'bite',
  'drawDai',
  'enoughMkrToWipe',
  'freeEth',
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
    acc[name] = function(...args) {
      return this._cdpService[name](this.id, ...args);
    };
    return acc;
  }, {})
);
