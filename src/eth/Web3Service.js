import PrivateService from '../core/PrivateService';
import Web3ProviderType from './Web3ProviderType';
import { promisifyAsyncMethods, getNetworkName } from '../utils';
import Web3 from 'web3';
import TestAccountProvider from '../utils/TestAccountProvider';
import Web3ServiceList from '../utils/Web3ServiceList';

const TIMER_CONNECTION = 'web3CheckConnectionStatus';
const TIMER_AUTHENTICATION = 'web3CheckAuthenticationStatus';
const TIMER_DEFAULT_DELAY = 5000;

export default class Web3Service extends PrivateService {
  constructor(name = 'web3') {
    super(name, ['log', 'timer', 'cache', 'event']);

    this._web3 = null;
    this._ethersProvider = null;
    this._blockListeners = {};
    this._currentBlock = null;
    this._ethersWallet = null;
    this._ethersUtils = null;
    this._info = {
      version: { api: null, node: null, network: null, ethereum: null },
      account: null
    };
    this._statusTimerDelay = TIMER_DEFAULT_DELAY;
    this._defaultEmitter = null;

    Web3ServiceList.push(this);
  }

  version() {
    return this._info.version;
  }

  networkId() {
    const result = this.version().network;

    if (result === null) {
      throw new Error('Cannot resolve network ID. Are you connected?');
    }

    return parseInt(result);
  }

  defaultAccount() {
    if (!this.manager().isAuthenticated()) {
      throw new Error('Default account is unavailable when not authenticated.');
    }

    return this._info.account;
  }

  ethersProvider() {
    return this._ethersProvider;
  }

  web3Provider() {
    return this._web3.currentProvider;
  }

  web3Contract(abi, address) {
    return this._web3.eth.contract(abi).at(address);
  }

  ethersSigner() {
    if (this._ethersWallet === null && this._ethersProvider === null) {
      throw new Error(
        'Cannot get ethersSigner: ethers wallet and provider are null.'
      );
    }

    return (
      this._ethersWallet ||
      this._ethersProvider.getSigner(this.defaultAccount())
    );
  }

  ethersUtils() {
    return this._ethersUtils;
  }

  initialize(settings) {
    this.get('log').info('Web3 is initializing...');

    this._defaultEmitter = this.get('event');

    settings = this._normalizeSettings(settings);

    this._web3 = this._createWeb3();
    this._web3.setProvider(this._getWeb3Provider(settings, this._web3));

    this._setStatusTimerDelay(settings.statusTimerDelay);
    this._setPrivateKey(settings.privateKey);

    this._installCleanUpHooks();
    this._defaultEmitter.emit('web3/INITIALIZED', {
      provider: { ...settings.provider }
    });
  }

  connect() {
    this.get('log').info('Web3 is connecting...');

    return Promise.all([
      _web3Promise(_ => this._web3.version.getNode(_)),
      _web3Promise(_ => this._web3.version.getNetwork(_)),
      _web3Promise(_ => this._web3.version.getEthereum(_))
    ])
      .then(versions => {
        if (!versions[0].includes('MetaMask')) {
          return _web3Promise(_ => this._web3.version.getWhisper(_), null)
            .then(whisperVersion => versions.push(whisperVersion))
            .then(() => {
              return versions;
            });
        } else {
          return versions;
        }
      })
      .then(
        versions => {
          this._info.version = {
            api: this._web3.version.api,
            node: versions[0],
            network: versions[1],
            ethereum: versions[2],
            whisper: versions[3]
          };

          this._setUpEthers(this.networkId());
          this._installDisconnectCheck();
          this._initEventPolling();
        },

        reason => {
          this.get('log').error(reason);
        }
      )
      .then(
        () => {
          this._defaultEmitter.emit('web3/CONNECTED', {
            ...this._info.version
          });
          this.get('log').info('Web3 version: ', this._info.version);
        },
        reason => this.get('log').error(reason)
      );
  }

  authenticate() {
    this.get('log').info('Web3 is authenticating...');

    return _web3Promise(_ => this._web3.eth.getAccounts(_)).then(
      data => {
        if (this._hasPrivateKey()) {
          this._info.account = this._ethersWallet.address;
        } else if (data instanceof Array && data.length > 0) {
          this._info.account = data[0];
        } else {
          throw new Error(
            'Expected Web3 to be authenticated, but no default account is available.'
          );
        }
        this._defaultEmitter.emit('web3/AUTHENTICATED', {
          account: this._info.account
        });
        this._installDeauthenticationCheck();
      },
      reason => {
        this.get('log').error(reason);
      }
    );
  }

  getNetwork() {
    return this._info.version['network'];
  }

  getDummyTransaction() {
    return {
      from: TestAccountProvider.nextAddress(),
      to: TestAccountProvider.nextAddress(),
      amount: this._web3.toWei('0.01')
    };
  }

  blockNumber() {
    return this._currentBlock;
  }

  onNewBlock(callback) {
    if (!this._blockListeners['*']) {
      this._blockListeners['*'] = [];
    }

    this._blockListeners['*'].push(callback);
  }

  async waitForBlockNumber(blockNumber) {
    if (blockNumber < this._currentBlock) {
      throw new Error('Cannot wait for past block ' + blockNumber);
    }

    if (blockNumber === this._currentBlock) {
      return Promise.resolve(blockNumber);
    }

    if (!this._blockListeners[blockNumber]) {
      this._blockListeners[blockNumber] = [];
    }

    return new Promise(resolve => {
      this._blockListeners[blockNumber].push(resolve);
    });
  }

  _updateBlockNumber(blockNumber) {
    this.get('log').info('New block: ', blockNumber);
    this._currentBlock = blockNumber;

    if (this._blockListeners[blockNumber]) {
      this._blockListeners[blockNumber].forEach(c => c(blockNumber));
      this._blockListeners[blockNumber] = undefined;
    }

    if (this._blockListeners['*']) {
      this._blockListeners['*'].forEach(c => c(blockNumber));
    }
  }

  _initEventPolling() {
    this.onNewBlock(this.get('event').ping);
  }

  _installCleanUpHooks() {
    this.manager().onDisconnected(() => {
      this.get('timer').disposeTimer(TIMER_CONNECTION);
    });

    this.manager().onDeauthenticated(() => {
      this.get('timer').disposeTimer(TIMER_AUTHENTICATION);
    });
  }

  _setUpEthers(chainId) {
    const ethers = require('ethers');
    this._ethersUtils = ethers.utils;
    this._ethersProvider = this._buildEthersProvider(ethers, chainId);
    this._ethersWallet = this._buildEthersWallet(
      ethers,
      this._privateKey,
      this._ethersProvider
    );
  }

  _buildEthersProvider(ethers, chainId) {
    const provider = new ethers.providers.Web3Provider(
      this._web3.currentProvider,
      { name: getNetworkName(chainId), chainId: chainId }
    );

    provider.on('block', num => this._updateBlockNumber(num));
    this.manager().onDisconnected(() => provider.removeAllListeners('block'));

    return provider;
  }

  _buildEthersWallet(ethers, privateKey, provider) {
    let wallet = null;

    if (privateKey) {
      try {
        wallet = new ethers.Wallet(privateKey, provider);
      } catch (e) {
        this.get('log').error(e);
      }
    }

    return wallet;
  }

  _normalizeSettings(settings) {
    const defaultSettings = {
      usePresetProvider: true,
      provider: {
        type: Web3ProviderType.HTTP,
        url: 'https://sai-service.makerdao.com/node'
      }
    };

    if (!settings) {
      settings = defaultSettings;
    }

    if (!settings.provider) {
      settings.provider = defaultSettings.provider;
    }

    return settings;
  }

  _createWeb3() {
    const web3 = new Web3();

    this.eth = {};
    Object.assign(
      this.eth,
      promisifyAsyncMethods(web3.eth, [
        'getAccounts',
        'estimateGas',
        'getBlock',
        'sendTransaction',
        'getBalance'
      ])
    );

    this.personal = {};
    Object.assign(
      this.personal,
      promisifyAsyncMethods(web3.personal, [
        'lockAccount',
        'newAccount',
        'unlockAccount'
      ])
    );

    return web3;
  }

  _setPrivateKey(privateKey) {
    if (
      privateKey &&
      (typeof privateKey !== 'string' ||
        privateKey.match(/^0x[0-9a-fA-F]{64}$/) === null)
    ) {
      throw new Error('Invalid private key format');
    }
    this._privateKey = privateKey || null;
  }

  _hasPrivateKey() {
    return !!this._privateKey;
  }

  _getWeb3Provider(settings, web3) {
    let web3Provider = null;

    if (
      settings.usePresetProvider &&
      typeof window != 'undefined' &&
      window.web3
    ) {
      this.get('log').info('Selecting preset Web3 provider...');
      web3Provider = window.web3.currentProvider;
      window.web3 = web3;
    } else {
      if (settings.usePresetProvider) {
        this.get('log').info(
          'Cannot find preset Web3 provider. Creating new instance...'
        );
      }
      web3Provider = this._buildWeb3Provider(settings.provider);
    }

    return web3Provider;
  }

  _buildWeb3Provider(providerSettings) {
    let provider;
    const { url, network, infuraApiKey, type } = providerSettings;
    const cacheKey = 'provider:' + JSON.stringify(providerSettings);
    const cache = this.get('cache');
    if (cache && cache.has(cacheKey)) return cache.fetch(cacheKey);

    switch (type) {
      case Web3ProviderType.HTTP:
        provider = new Web3.providers.HttpProvider(url);
        break;
      case Web3ProviderType.INFURA:
        provider = new Web3.providers.HttpProvider(
          'https://' + network + '.infura.io/' + infuraApiKey
        );
        break;
      case Web3ProviderType.TEST:
        provider = new Web3.providers.HttpProvider('http://127.1:2000');
        break;
      default:
        throw new Error('Illegal web3 provider type: ' + type);
    }

    if (cache) cache.store(cacheKey, provider);
    return provider;
  }

  _setStatusTimerDelay(delay) {
    this._statusTimerDelay = delay ? parseInt(delay) : TIMER_DEFAULT_DELAY;
  }

  _installDisconnectCheck() {
    this.get('timer').createTimer(
      TIMER_CONNECTION,
      this._statusTimerDelay,
      true,
      () =>
        this._isStillConnected().then(connected => {
          if (!connected) {
            this._defaultEmitter.emit('web3/DISCONNECTED');
            this.disconnect();
          }
        })
    );
  }

  _isStillConnected() {
    return Promise.all([
      _web3Promise(_ => this._web3.version.getNode(_)), // can remove this
      _web3Promise(_ => this._web3.version.getNetwork(_))
    ]).then(
      versionInfo =>
        versionInfo[1] != null &&
        versionInfo[1] === this._info.version['network'],
      () => false
    );
  }

  _installDeauthenticationCheck() {
    this.get('timer').createTimer(
      TIMER_AUTHENTICATION,
      this._statusTimerDelay, //what should this number be?
      true,
      () =>
        this._isStillAuthenticated().then(authenticated => {
          if (!authenticated) {
            this._defaultEmitter.emit('web3/DEAUTHENTICATED');
            this.deauthenticate();
          }
        })
    );
  }

  _isStillAuthenticated() {
    if (this._hasPrivateKey()) return this._isStillConnected();
    return _web3Promise(_ => this._web3.eth.getAccounts(_)).then(
      accounts =>
        accounts instanceof Array && accounts[0] === this._info.account,
      () => false
    );
  }
}

/* istanbul ignore next */
export function _web3Promise(cb, onErrorValue) {
  return new Promise((resolve, reject) => {
    try {
      cb((error, result) => {
        if (error) {
          if (typeof onErrorValue === 'undefined') {
            //console.log(error);
            //console.log(new Error().stack);
            reject(error);
          } else {
            resolve(onErrorValue);
          }
        } else {
          resolve(result);
        }
      });
    } catch (e) {
      if (typeof onErrorValue === 'undefined') {
        //console.log(e);
        reject(e);
      } else {
        resolve(onErrorValue);
      }
    }
  });
}
