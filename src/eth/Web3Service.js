import PrivateService from '../core/PrivateService';
import Web3ProviderType from './Web3ProviderType';
import { promisifyAsyncMethods, getNetworkName } from '../utils';
import NullLogger from '../utils/loggers/NullLogger';
import TimerService from '../utils/TimerService';
import Web3 from 'web3';
import TestAccountProvider from '../utils/TestAccountProvider';
import Web3ServiceList from '../utils/Web3ServiceList';


export default class Web3Service extends PrivateService {

  static buildTestService(privateKey = null) {
    const service = new Web3Service();

    service
      .manager()
      .inject('log', new NullLogger())
      .inject('timer', new TimerService())
      .settings({
        usePresetProvider: true,
        privateKey: privateKey,
        provider: { type: Web3ProviderType.TEST }
      });

    return service;
  }

  static buildInfuraService(network, privateKey = null) {
    const service = new Web3Service();

    service
      .manager()
      .inject('log', new NullLogger())
      .inject('timer', new TimerService())
      .settings({
        usePresetProvider: false,
        privateKey: privateKey,
        provider: {
          type: Web3ProviderType.INFURA,
          network: network,
          infuraApiKey: 'ihagQOzC3mkRXYuCivDN'
        }
      });

    return service;
  }

  constructor(name = 'web3') {
    super(name, ['log', 'timer']);

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
    settings = this._normalizeSettings(settings);

    this._web3 = this._createWeb3();
    this._web3.setProvider(this._getWeb3Provider(settings));

    this._setPrivateKey(settings.privateKey);
  }

  connect() {
    return Promise.all([
      _web3Promise(_ => this._web3.version.getNode(_)),
      _web3Promise(_ => this._web3.version.getNetwork(_)),
      _web3Promise(_ => this._web3.version.getEthereum(_)),
      _web3Promise(_ => this._web3.version.getWhisper(_), null)
    ])
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
          //console.log('network id is :', this.networkId());

          this.get('timer').createTimer(
            'web3CheckConnectionStatus',
            500,
            true,
            () =>
              this._isStillConnected().then(connected => {
                if (!connected) {
                  this.disconnect();
                }
              })
          );
        },

        reason => {
          this.get('log').error(reason);
        }
      )
      .then(
        () => this.get('log').info('Web3 version: ', this._info.version),
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
          throw new Error('Expected Web3 to be authenticated, but no default account is available.');
        }

        this.get('timer').createTimer(
          'web3CheckAuthenticationStatus',
          300, //what should this number be?
          true,
          () =>
            this._isStillAuthenticated().then(authenticated => {
              if (!authenticated) {
                this.deauthenticate();
              }
            })
        );
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

  waitForBlockNumber(blockNumber, callback) {
    if (blockNumber < this._currentBlock) {
      throw new Error('Cannot wait for past block ' + blockNumber);
    } else if (blockNumber === this._currentBlock) {
      callback(blockNumber);
    } else {
      if (!this._blockListeners[blockNumber]) {
        this._blockListeners[blockNumber] = [];
      }
      this._blockListeners[blockNumber].push(callback);
    }
  }

  _updateBlockNumber(blockNumber) {
    //console.log('new blockNumber: ', blockNumber);
    if (this._blockListeners[blockNumber]) {
      this._blockListeners[blockNumber].forEach(c => c(blockNumber));
      this._blockListeners[blockNumber] = undefined;
    }
    this._currentBlock = blockNumber;
  }

  _setUpEthers(chainId) {
    const ethers = require('ethers');
    this._ethersUtils = ethers.utils;
    this._ethersProvider = this._buildEthersProvider(ethers, chainId);
    this._ethersWallet = this._buildEthersWallet(ethers, this._privateKey, this._ethersProvider);
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

  _getWeb3Provider(settings) {
    let web3Provider = null;

    if (settings.usePresetProvider && window && window.web3) {
      web3Provider = window.web3.currentProvider;
      window.web3 = web3;
    } else {
      web3Provider = this._buildWeb3Provider(settings.provider);
    }

    return web3Provider;
  }

  _buildWeb3Provider(settings) {
    switch (settings.type) {
      case Web3ProviderType.HTTP:
        return new Web3.providers.HttpProvider(settings.url);
      case Web3ProviderType.INFURA:
        return new Web3.providers.HttpProvider(
          'https://' + settings.network + '.infura.io/' + settings.infuraApiKey
        );
      case Web3ProviderType.TEST:
        return new Web3.providers.HttpProvider('http://127.1:2000');
      default:
        throw new Error(
          'Illegal web3 provider type: ' + settings.provider.type
        );
    }
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
            console.log(error);
            console.log(new Error().stack);
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
        console.log(e);
        console.log(e.stack);
        reject(e);
      } else {
        resolve(onErrorValue);
      }
    }
  });
}
