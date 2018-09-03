import { USD } from './Currency';

export default class ProxyCdp {
  constructor(cdpService, dsProxyAddress = null, cdpId = null) {
    this._dsProxyAddressPromise = Promise.resolve(dsProxyAddress);

    this._cdpService = cdpService;
    this._smartContractService = this._cdpService.get('smartContract');
    this._transactionManager = this._smartContractService.get(
      'transactionManager'
    );

    // TODO: If proxy address is null, create new DSProxy? (Just like cdpId)
    // And if lockAndDraw is being called, change to createLockAndDraw etc?

    if (cdpId === null) {
      // TODO: Implement CDP creation via DSProxy
      throw new Error('Must specify CPD ID');
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

  transactionObject() {
    return this._transactionObject;
  }

  getId() {
    return this._cdpIdPromise;
  }

  getDsProxyAddress() {
    return this._dsProxyAddressPromise;
  }
}

// each of these methods calls the method of the same name on the service (suffixed
// with Proxy) with the DSProxy's address & CDP's id as the first and second argument
const passthroughMethods = [
  // 'bite',
  'drawDai',
  'freeEth',
  // 'freePeth',
  // 'getCollateralValue',
  // 'getCollateralizationRatio',
  // 'getDebtValue',
  // 'getGovernanceFee',
  // 'getInfo',
  // 'getLiquidationPrice',
  // 'give',
  // 'isSafe',
  'lockEth',
  // 'lockPeth',
  // 'lockWeth',
  // 'shut',
  'wipeDai'
];

Object.assign(
  ProxyCdp.prototype,
  passthroughMethods.reduce((acc, name) => {
    acc[name] = async function(...args) {
      return this._cdpService[name + 'Proxy'](
        await this.getDsProxyAddress(),
        await this.getId(),
        ...args
      );
    };
    return acc;
  }, {})
);
