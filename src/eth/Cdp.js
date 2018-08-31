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
    const currentAccount = this._smartContractService
      .get('web3')
      .currentAccount();

    return new Promise(resolve => {
      tubContract.onlognewcup = function(address, cdpIdBytes32) {
        if (currentAccount.toLowerCase() == address.toLowerCase()) {
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

    // FIXME push this back down into SmartContractService
    this._transactionObject = this._transactionManager.formatHybridTx(
      tubContract,
      'open',
      [],
      'SAI_TUB',
      this
    );

    return captureCdpIdPromise.then(result => result);
  }

  transactionObject() {
    return this._transactionObject;
  }

  getId() {
    return this._cdpIdPromise;
  }
}

Cdp.find = async function(id, cdpService) {
  if (typeof id !== 'number') {
    throw new Error('ID must be a number.');
  }

  const info = await cdpService.getInfo(id);
  if (info.lad.toString() === '0x0000000000000000000000000000000000000000') {
    throw new Error("That CDP doesn't exist--try opening a new one.");
  }

  return new Cdp(cdpService, id);
};

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
