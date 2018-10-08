import contracts from '../../contracts/contracts';
import { utils as ethersUtils } from 'ethers';
import { USD } from './Currency';

export default class ProxyCdp {
  constructor(cdpService, dsProxyAddress, cdpId) {
    this._cdpService = cdpService;
    this._smartContractService = this._cdpService.get('smartContract');
    this._transactionManager = this._smartContractService.get(
      'transactionManager'
    );

    if (dsProxyAddress) {
      this.dsProxyAddress = dsProxyAddress.toLowerCase();
    }

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

  _getDsProxyAddress() {
    const dsProxyFactoryContract = this._smartContractService.getContractByName(
      contracts.DS_PROXY_FACTORY
    );
    const currentAccount = this._smartContractService
      .get('web3')
      .currentAccount();

    const self = this;
    return new Promise(resolve => {
      // sender = ProxyRegistry, owner = you, proxy = new DSProxy address, cache = DSProxyCache
      // eslint-disable-next-line
      dsProxyFactoryContract.oncreated = function(sender, owner, proxy, cache) {
        if (currentAccount.toLowerCase() == owner.toLowerCase()) {
          this.removeListener();
          self.dsProxyAddress = proxy.toLowerCase();
          resolve(self.getDsProxyAddress);
        }
      };
    });
  }

  _getCdpId(saiProxyAddress, tubContract, dsProxyAddressPromise) {
    return new Promise(resolve => {
      // If using an existing DSProxy, listen for the LogNewCup event
      const existingDsProxyAddress = this.dsProxyAddress;
      if (existingDsProxyAddress) {
        tubContract.onlognewcup = function(address, cdpIdBytes32) {
          if (existingDsProxyAddress == address.toLowerCase()) {
            const cdpId = ethersUtils.bigNumberify(cdpIdBytes32).toNumber();
            this.removeListener();
            resolve(cdpId);
          }
        };
      }
      // If a new DSProxy instance is being created at the same time as the cup,
      // listen for the give event (via DSNote) rather than the LogNewCup event
      else {
        const provider = this._smartContractService
          .get('web3')
          .ethersProvider();
        const topics = [
          ethersUtils.id('give(bytes32,address)').substring(0, 10) +
            '0'.repeat(56),
          '0x000000000000000000000000' + saiProxyAddress.substring(2)
          // '0x000000000000000000000000' + proxy.substring(2)
        ];
        provider.on(topics, log => {
          Promise.resolve(dsProxyAddressPromise).then(() => {
            const proxyInLog = '0x' + log.topics[3].substr(26).toLowerCase();
            if (this.dsProxyAddress === proxyInLog) {
              resolve(ethersUtils.bigNumberify(log.topics[2]).toNumber());
            }
          });
        });
      }
    });
  }

  _create() {
    const tub = this._smartContractService.getContractByName(contracts.SAI_TUB);
    const saiProxy = this._smartContractService.getContractByName(
      contracts.SAI_PROXY
    );

    let method, args, dsProxyAddressPromise;
    if (!this.dsProxyAddress) {
      const proxyRegistryAddress = this._smartContractService.getContractAddressByName(
        contracts.PROXY_REGISTRY
      );

      method = 'createAndOpen';
      args = [proxyRegistryAddress, tub.address, { promise }];
      dsProxyAddressPromise = this._getDsProxyAddress();
    } else {
      method = 'open';
      args = [tub.address, { dsProxyAddress: this.dsProxyAddress, promise }];
    }

    const promise = (async () => {
      // this "no-op await" is necessary for the inner reference to the
      // outer promise to become valid
      await 0;
      const results = await Promise.all([
        this._getCdpId(saiProxy.address, tub, dsProxyAddressPromise),
        saiProxy[method](...args)
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

// Each of these passthrough methods gets called on the EthereumCdpService
// If the second array item is true then the method name with 'Proxy' appended is
// called and the DSProxy address and CDP id are passed as the first and second arg
// Otherwise the method name is called and the just CDP id is passed
const passthroughMethods = [
  ['bite', false],
  ['drawDai', true],
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
  ['wipeDai', true]
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
