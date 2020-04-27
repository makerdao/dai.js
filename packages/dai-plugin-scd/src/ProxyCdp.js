import contracts from '../contracts/contracts';
import { getCurrency, SAI, ETH, USD } from './Currency';

export default class ProxyCdp {
  constructor(
    cdpService,
    dsProxyAddress,
    cdpId,
    { lockAndDraw = false, amountEth = null, amountSai = null } = {}
  ) {
    this._cdpService = cdpService;
    this._smartContractService = this._cdpService.get('smartContract');
    this._transactionManager = this._smartContractService.get('transactionManager'); // prettier-ignore

    if (dsProxyAddress) this.dsProxyAddress = dsProxyAddress.toLowerCase();
    if (lockAndDraw) {
      this._create({ lockAndDraw, amountEth, amountSai });
    } else {
      if (!cdpId) this._create();
      else this.id = cdpId;
    }

    this._emitterInstance = this._cdpService.get('event').buildEmitter();
    this.on = this._emitterInstance.on;
    this._emitterInstance.registerPollEvents({
      COLLATERAL: {
        USD: () => this.getCollateralValue(USD),
        ETH: () => this.getCollateralValue()
      },
      DEBT: {
        sai: () => this.getDebtValue()
      }
    });
  }

  _create({ lockAndDraw = false, amountEth = null, amountSai = null } = {}) {
    const tub = this._smartContractService.getContract(contracts.SAI_TUB);
    const saiProxy = this._smartContractService.getContract(contracts.SAI_PROXY); // prettier-ignore

    let method, args;
    if (!this.dsProxyAddress) {
      const proxyRegistryAddress = this._smartContractService.getContractAddressByName(contracts.PROXY_REGISTRY); // prettier-ignore

      if (lockAndDraw) {
        const valueEth = getCurrency(amountEth, ETH).toFixed('wei');
        const valueSai = getCurrency(amountSai, SAI).toFixed('wei');
        method = 'createOpenLockAndDraw';
        args = [
          proxyRegistryAddress,
          tub.address,
          valueSai,
          {
            metadata: {
              action: {
                name: method,
                amountEth: getCurrency(amountEth, ETH),
                amountSai: getCurrency(amountSai, SAI)
              }
            },
            value: valueEth,
            promise
          }
        ];
      } else {
        method = 'createAndOpen';
        args = [
          proxyRegistryAddress,
          tub.address,
          {
            metadata: {
              action: {
                name: method
              }
            },
            promise
          }
        ];
      }
    } else {
      if (lockAndDraw) {
        const valueEth = getCurrency(amountEth, ETH).toFixed('wei');
        const valueSai = getCurrency(amountSai, SAI).toFixed('wei');
        method = 'lockAndDraw(address,uint256)';
        args = [
          tub.address,
          valueSai,
          {
            metadata: {
              action: {
                name: 'openLockAndDraw',
                amountEth: getCurrency(amountEth, ETH),
                amountSai: getCurrency(amountSai, SAI),
                proxy: this.dsProxyAddress
              }
            },
            value: valueEth,
            dsProxy: this.dsProxyAddress,
            promise
          }
        ];
      } else {
        method = 'open';
        args = [
          tub.address,
          {
            metadata: {
              action: {
                name: method,
                proxy: this.dsProxyAddress
              }
            },
            dsProxy: this.dsProxyAddress,
            promise
          }
        ];
      }
    }

    const getId = txo => {
      let log;
      switch (txo.metadata.method) {
        case 'createAndOpen':
          log = txo.receipt.logs[5];
          break;
        case 'createOpenLockAndDraw':
          log = txo.receipt.logs[5];
          break;
        case 'lockAndDraw':
          log = txo.receipt.logs[2];
          break;
        case 'open':
          log = txo.receipt.logs[2];
      }

      if (!this.dsProxyAddress) {
        this.dsProxyAddress = txo.receipt.logs[0].address;
      }

      return parseInt(log.data, 16);
    };

    const promise = (async () => {
      const txo = await saiProxy[method](...args);
      this.id = getId(txo);
      return this;
    })();
    this._transactionObject = promise;
  }

  transactionObject() {
    return this._transactionObject;
  }
}

// Each of these passthrough methods gets called on the EthereumCdpService
// If the second array item is true then the method name with 'Proxy' appended is
// called and the DSProxy address and CDP id are passed as the first and second arg
// Otherwise the method name is called and the just CDP id is passed
const passthroughMethods = [
  ['bite', false],
  ['drawSai', true],
  ['enoughMkrToWipe', false],
  ['freeEth', true],
  // 'freePeth',
  ['getCollateralValue', false],
  ['getCollateralizationRatio', false],
  ['getDebtValue', false],
  ['getGovernanceFee', false],
  ['getInfo', false],
  ['getLiquidationPrice', false],
  ['isSafe', false],
  ['give', true],
  ['lockEth', true],
  // 'lockPeth',
  // 'lockWeth',
  ['shut', true],
  ['wipeSai', true],
  ['lockEthAndDrawSai', true]
];

Object.assign(
  ProxyCdp.prototype,
  passthroughMethods.reduce((acc, [name, useProxy]) => {
    acc[name] = useProxy
      ? function(...args) {
          return this._cdpService[name + 'Proxy'](
            this.dsProxyAddress,
            this.id,
            ...args
          );
        }
      : function(...args) {
          return this._cdpService[name](this.id, ...args);
        };

    return acc;
  }, {})
);
