import contracts from '../../contracts/contracts';
import { utils as ethersUtils } from 'ethers';
import { USD } from './Currency';

export default class ProxyCdp {
  constructor(cdpService, dsProxyAddress = null, cdpId = null) {
    this._cdpService = cdpService;
    this._smartContractService = this._cdpService.get('smartContract');
    this._transactionManager = this._smartContractService.get(
      'transactionManager'
    );

    if (dsProxyAddress === null && cdpId === null) {
      this._newProxyCdpPromise();
    } else if (dsProxyAddress !== null && cdpId === null) {
      this._newProxyCdpPromise(dsProxyAddress.toLowerCase());
    } else {
      this._dsProxyAddressPromise = Promise.resolve(
        dsProxyAddress.toLowerCase()
      );
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

  _captureDsProxyAddressPromise(dsProxyFactoryContract) {
    const currentAccount = this._smartContractService
      .get('web3')
      .currentAccount();

    return new Promise(resolve => {
      // sender = ProxyRegistry, owner = you, proxy = new DSProxy address, cache = DSProxyCache
      // eslint-disable-next-line
      dsProxyFactoryContract.oncreated = function(sender, owner, proxy, cache) {
        if (currentAccount.toLowerCase() == owner.toLowerCase()) {
          resolve(proxy.toLowerCase());
          this.removeListener();
        }
      };
    });
  }

  _captureCdpIdPromise(
    saiProxyAddress,
    captureDsProxyAddressPromise,
    existingDsProxyAddress,
    tubContract
  ) {
    return new Promise((resolve, reject) => {
      // If using an existing DSProxy, listen for the LogNewCup event
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
          captureDsProxyAddressPromise
            .then(proxy => {
              const proxyInLog = '0x' + log.topics[3].substr(26).toLowerCase();
              if (proxy === proxyInLog) {
                const cdpId = ethersUtils
                  .bigNumberify(log.topics[2])
                  .toNumber();
                resolve(cdpId);
              }
            })
            .catch(err => reject(err));
        });
      }
    });
  }

  _newProxyCdpPromise(dsProxyAddress = null) {
    const proxyRegistryAddress = this._smartContractService.getContractAddressByName(
      contracts.PROXY_REGISTRY
    );
    const tubContract = this._smartContractService.getContractByName(
      contracts.SAI_TUB,
      { hybrid: false }
    );
    const dsProxyFactoryContract = this._smartContractService.getContractByName(
      contracts.DS_PROXY_FACTORY,
      { hybrid: false }
    );
    const saiProxyContract = this._smartContractService.getContractByName(
      contracts.SAI_PROXY,
      { hybrid: false }
    );

    if (dsProxyAddress === null) {
      this._dsProxyAddressPromise = this._captureDsProxyAddressPromise(
        dsProxyFactoryContract
      );
      this._transactionObject = this._transactionManager.formatHybridTx(
        saiProxyContract,
        'createAndOpen',
        [proxyRegistryAddress, tubContract.address],
        'SAI_PROXY',
        this
      );
    } else {
      this._dsProxyAddressPromise = Promise.resolve(dsProxyAddress);
      this._transactionObject = this._transactionManager.formatHybridTx(
        saiProxyContract,
        'open',
        [tubContract.address, { dsProxyAddress: dsProxyAddress }],
        'SAI_PROXY',
        this
      );
    }
    this._cdpIdPromise = this._captureCdpIdPromise(
      saiProxyContract.address,
      this._dsProxyAddressPromise,
      dsProxyAddress,
      tubContract
    );
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
  passthroughMethods.reduce((acc, name) => {
    acc[name[0]] = async function(...args) {
      return name[1] === true
        ? this._cdpService[name[0] + 'Proxy'](
            await this.getDsProxyAddress(),
            await this.getId(),
            ...args
          )
        : this._cdpService[name[0]](await this.getId(), ...args);
    };
    return acc;
  }, {})
);
