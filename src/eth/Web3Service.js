import PrivateService from '../core/PrivateService';
import { promisify, promisifyMethods, getNetworkName } from '../utils';
import Web3ServiceList from '../utils/Web3ServiceList';
import promiseProps from 'promise-props';
import Web3 from 'web3';

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
    this._transactionSettings = null;

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
    return this.get('accounts').currentAddress();
  }

  ethersProvider() {
    return this._ethersProvider;
  }

  web3Provider() {
    return this._web3.currentProvider;
  }

  transactionSettings() {
    return this._transactionSettings;
  }

  web3Contract(abi, address) {
    return this._web3.eth.contract(abi).at(address);
  }

  async initialize(settings) {
    this.get('log').info('Web3 is initializing...');
    this._defaultEmitter = this.get('event');

    this._web3 = new Web3();
    this._web3.setProvider(this.get('accounts').getProvider());

    // TODO: is this still necessary? it seems confusing to have methods
    // that look like web3.eth methods but behave differently
    this.eth = {};
    Object.assign(
      this.eth,
      promisifyMethods(this._web3.eth, [
        'getAccounts',
        'estimateGas',
        'getBlock',
        'sendTransaction',
        'getBalance'
      ])
    );

    this._setStatusTimerDelay(settings.statusTimerDelay);
    this._installCleanUpHooks();
    this._defaultEmitter.emit('web3/INITIALIZED', {
      provider: { ...settings.provider }
    });
    this._transactionSettings = settings.transactionSettings;
  }

  async connect() {
    this.get('log').info('Web3 is connecting...');

    this._info.version = await promiseProps({
      api: this._web3.version.api,
      node: promisify(this._web3.version.getNode)(),
      network: promisify(this._web3.version.getNetwork)(),
      ethereum: promisify(this._web3.version.getEthereum)()
    });

    if (!this._info.version.node.includes('MetaMask')) {
      this._info.version.whisper = await promisify(
        this._web3.version.getWhisper
      )().catch(() => '');
    }
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

    this._defaultEmitter.emit('web3/AUTHENTICATED', {
      account: this.currentAccount()
    });
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
    if (this.get('accounts').hasNonProviderAccount())
      return this._isStillConnected();
    const account = (await promisify(this._web3.eth.getAccounts)())[0];
    return account === this.currentAccount();
  }
}
