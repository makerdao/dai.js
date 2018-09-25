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
    const tubContract = this._smartContractService.getContractByName(
      contracts.SAI_TUB
    );

    const currentAccount = this._smartContractService
      .get('web3')
      .currentAccount();

    const getId = new Promise(resolve => {
      tubContract.onlognewcup = function(address, cdpIdBytes32) {
        if (currentAccount.toLowerCase() == address.toLowerCase()) {
          this.removeListener();
          resolve(ethersUtils.bigNumberify(cdpIdBytes32).toNumber());
        }
      };
    });

    this._transactionObject = this._transactionManager.createHybridTx(
      (async () => {
        const [id, openResult] = await Promise.all([getId, tubContract.open()]);
        this.id = id;
        return openResult;
      })(),
      {
        businessObject: this,
        metadata: { contract: 'SAI_TUB', method: 'open' }
      }
    );
  }

  transactionObject() {
    return this._transactionObject;
  }

  getId() {
    return Promise.resolve(this.id);
  }
}

// each of these methods just calls the method of the same name on the service
// with the cdp's id as the first argument
const passthroughMethods = [
  'bite',
  'drawDai',
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
