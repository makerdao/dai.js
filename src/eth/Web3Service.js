import PrivateService from '../core/PrivateService';
import Web3ProviderType from './Web3ProviderType';
import { promisify, promisifyMethods, getNetworkName } from '../utils';
import Web3 from 'web3';
import Web3ServiceList from '../utils/Web3ServiceList';
import Web3ProviderEngine from 'web3-provider-engine/dist/es5';
import RpcSource from 'web3-provider-engine/dist/es5/subproviders/rpc';
import promiseProps from 'promise-props';

const TIMER_CONNECTION = 'web3CheckConnectionStatus';
const TIMER_AUTHENTICATION = 'web3CheckAuthenticationStatus';
const TIMER_DEFAULT_DELAY = 5000;

export default class Web3Service extends PrivateService {
  constructor(name = 'web3') {
    super(name, ['accounts', 'log', 'timer', 'cache', 'event']);

    this._web3 = null;
    this._ethersProvider = null;
    this._blockListeners = {};
    this._currentBlock = null;
    this._info = { version: {} };
    this._statusTimerDelay = TIMER_DEFAULT_DELAY;
    this._defaultEmitter = null;

    Web3ServiceList.push(this);
  }

  version() {
    return this._info.version;
  }

  networkId() {
    const result = this.version().network;
    if (!result) {
      throw new Error('Cannot resolve network ID. Are you connected?');
    }
    return parseInt(result);
  }

  currentAccount() {
    if (!this.manager().isAuthenticated()) {
      throw new Error('Not authenticated.');
    }

    const accounts = this.get('accounts');
    if (accounts.hasAccount()) return accounts.currentAddress();

    return this._providerAccountAddress;
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

  async initialize(settings) {
    this.get('log').info('Web3 is initializing...');

    this._defaultEmitter = this.get('event');

    settings = this._normalizeSettings(settings);

    this._web3 = this._createWeb3();
    this._web3.setProvider(this._getWeb3Provider(settings, this._web3));

    this._setStatusTimerDelay(settings.statusTimerDelay);

    this._installCleanUpHooks();
    this._defaultEmitter.emit('web3/INITIALIZED', {
      provider: { ...settings.provider }
    });
  }

  async connect() {
    this.get('log').info('Web3 is connecting...');

    this._info.version = await promiseProps({
      api: this._web3.version.api,
      node: promisify(this._web3.version.getNode)(),
      network: promisify(this._web3.version.getNetwork)(),
      ethereum: promisify(this._web3.version.getEthereum)(),
      whisper: promisify(this._web3.version.getWhisper)().catch(() => '')
    });
    this._setUpEthers(this.networkId());
    this._installDisconnectCheck();
    await this._initEventPolling();
    this._defaultEmitter.emit('web3/CONNECTED', {
      ...this._info.version
    });
    this.get('log').info('Web3 version: ', this._info.version);
  }

  async authenticate() {
    this.get('log').info('Web3 is authenticating...');

    const account = (await promisify(this._web3.eth.getAccounts)())[0];
    this._defaultEmitter.emit('web3/AUTHENTICATED', { account });
    this._providerAccountAddress = account;
    this._installDeauthenticationCheck();
  }

  getNetwork() {
    return this._info.version.network;
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
    this._ethersProvider = this._buildEthersProvider(ethers, chainId);
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
      promisifyMethods(web3.eth, [
        'getAccounts',
        'estimateGas',
        'getBlock',
        'sendTransaction',
        'getBalance'
      ])
    );

    return web3;
  }

  _getWeb3Provider(settings, web3) {
    let web3Provider;

    // TODO: rather than having usePresetProvider override the provider
    // completely, should it just add an account? that's tricky... because
    // users expect MetaMask to handle not just signing but sending, choice of
    // network, etc.
    //
    // we need to support the case where we get most of the provider behavior
    // from MetaMask but still use a specified wallet for signing

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
    const { network, infuraApiKey, type } = providerSettings;

    let rpcUrl;
    switch (type) {
      case Web3ProviderType.HTTP:
        rpcUrl = providerSettings.url;
        break;
      case Web3ProviderType.INFURA:
        rpcUrl = `https://${network}.infura.io/${infuraApiKey || ''}`;
        break;
      case Web3ProviderType.TEST:
        rpcUrl = 'http://127.1:2000';
        break;
      default:
        throw new Error('Invalid web3 provider type: ' + type);
    }

    const engine = new Web3ProviderEngine();
    engine.addProvider(new RpcSource({ rpcUrl }));
    this.get('accounts').attachToEngine(engine);
    return engine;
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
    return promisify(this._web3.version.getNetwork)()
      .then(network => network === this._info.version['network'])
      .catch(() => false);
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

  async _isStillAuthenticated() {
    if (this.get('accounts').hasAccount()) return this._isStillConnected();
    const account = (await promisify(this._web3.eth.getAccounts)())[0];
    return account === this._providerAccountAddress;
  }
}
