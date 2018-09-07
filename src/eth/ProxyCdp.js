import { USD } from './Currency';

export default class ProxyCdp {
  constructor(cdpService, dsProxyAddress = null, cdpId = null) {
    // TODO: Implement DSProxy creation via ProxyRegistry, but have ability to
    // defer, so that SaiProxyCreateAndExecute.createLockAndDraw() can be used
    if (dsProxyAddress === null) {
      throw new Error('Must specify DSProxy address');
    }
    // TODO: Implement CDP creation via DSProxy, SaiProxy & ProxyRegistry
    if (cdpId === null) {
      throw new Error('Must specify CPD ID');
    }
    this._dsProxyAddressPromise = Promise.resolve(dsProxyAddress);
    this._cdpIdPromise = Promise.resolve(cdpId);
    this._cdpService = cdpService;
    this._smartContractService = this._cdpService.get('smartContract');
    this._transactionManager = this._smartContractService.get(
      'transactionManager'
    );
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

// Each of these methods calls the method of the same name on the service (suffixed
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
