import contracts from '../../contracts/contracts';
import { utils as ethersUtils } from 'ethers';
import { USD } from './Currency';

export default class Cdp {
  constructor(cdpService, cdpId = null) {
    this._cdpService = cdpService;
    this._smartContractService = this._cdpService.get('smartContract');
    this._web3Service = this._smartContractService.get('web3');

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

    const currentAccount = this._smartContractService
      .get('web3')
      .currentAccount();

    const getId = new Promise(async resolve => {
      let id;
      if (this._web3Service.usingWebsockets()) {
        const saiTub = this._smartContractService._getContractInfo(
          contracts.SAI_TUB
        );
        id = (await this._web3Service.waitForMatchingEvent(
          saiTub,
          'LogNewCup',
          log => {
            return log.lad.toLowerCase() === currentAccount.toLowerCase();
          }
        )).cup;
      } else {
        id = await new Promise(resolve => {
          tubContract.onlognewcup = (lad, cup) => {
            if (lad.toLowerCase() === currentAccount.toLowerCase()) {
              resolve(cup);
            }
          };
        });
      }
      resolve(ethersUtils.bigNumberify(id).toNumber());
    });

    const promise = (async () => {
      // this "no-op await" is necessary for the inner reference to the
      // outer promise to become valid
      await 0;
      const results = await Promise.all([
        getId,
        tubContract.open({
          metadata: {
            action: {
              name: 'open'
            }
          },
          promise
        })
      ]);
      this.id = results[0];
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
