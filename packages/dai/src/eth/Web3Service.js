import { PrivateService } from '@makerdao/services-core';
import { promisify, getNetworkName } from '../utils';
import Web3ServiceList from '../utils/Web3ServiceList';
import promiseProps from 'promise-props';
import Web3 from 'web3';
import ProviderType from './web3/ProviderType';
import makeSigner from './web3/ShimEthersSigner';
import last from 'lodash/last';

const TIMER_CONNECTION = 'web3CheckConnectionStatus';
const TIMER_AUTHENTICATION = 'web3CheckAuthenticationStatus';
const TIMER_DEFAULT_DELAY = 5000;

export default class Web3Service extends PrivateService {
  constructor(name = 'web3') {
    super(name, ['accounts', 'log', 'timer', 'cache', 'event']);

    this._blockListeners = {};
    this._info = {};
    this._statusTimerDelay = TIMER_DEFAULT_DELAY;
    Web3ServiceList.push(this);
  }

  info() {
    return this._info;
  }

  networkId() {
    const result = this.info().network;
    if (!result) {
      throw new Error('Cannot resolve network ID. Are you connected?');
    }
    return parseInt(result);
  }

  currentAddress() {
    return this.get('accounts').currentAddress();
  }

  getEthersSigner() {
    if (!this._ethersSigner) this._ethersSigner = makeSigner(this);
    return this._ethersSigner;
  }

  web3Provider() {
    return this._web3.currentProvider;
  }

  transactionSettings() {
    return this._transactionSettings;
  }

  usingWebsockets() {
    return (
      this._serviceManager._settings.provider.type === ProviderType.WEBSOCKET
    );
  }

  confirmedBlockCount() {
    return this._confirmedBlockCount;
  }

  web3Contract(abi, address) {
    return new this._web3.eth.Contract(abi, address);
  }

  initialize(settings) {
    this.get('log').info('Web3 is initializing...');
    this._defaultEmitter = this.get('event');

    this._web3 = new Web3();
    this._web3.setProvider(this.get('accounts').getProvider());

    Object.assign(
      this,
      [
        'estimateGas',
        'getAccounts',
        'getBalance',
        'getBlock',
        'getPastLogs',
        'getStorageAt',
        'getTransaction',
        'getTransactionReceipt',
        'subscribe'
      ].reduce((acc, method) => {
        acc[method] = (...args) => this._web3.eth[method](...args);
        return acc;
      }, {})
    );

    this.eth = new Proxy(this, {
      get(target, key) {
        if (typeof key === 'string')
          console.warn(`use .${key} instead of .eth.${key}`);
        return target[key];
      }
    });

    this._setStatusTimerDelay(settings.statusTimerDelay);
    this._installCleanUpHooks();
    this._defaultEmitter.emit('web3/INITIALIZED', {
      provider: { ...settings.provider }
    });
    this._transactionSettings = settings.transactionSettings;
    this._confirmedBlockCount = settings.confirmedBlockCount || 5;
    this._pollingInterval = settings.pollingInterval || 4000;
  }

  async connect() {
    this.get('log').info('Web3 is connecting...');

    this._info = await promiseProps({
      api: this._web3.version,
      node: promisify(this._web3.eth.getNodeInfo)(),
      network: promisify(this._web3.eth.net.getId)(),
      ethereum: promisify(this._web3.eth.getProtocolVersion)()
    });

    if (!this._info.node.includes('MetaMask')) {
      this._info.whisper = this._web3.shh;
    }

    this._currentBlock = await this._web3.eth.getBlockNumber();
    this._listenForNewBlocks();

    this._installDisconnectCheck();
    await this._initEventPolling();
    this._defaultEmitter.emit('web3/CONNECTED', {
      ...this._info
    });
    this.get('log').info('Web3 version: ', this._info.api);
  }

  async authenticate() {
    this.get('log').info('Web3 is authenticating...');

    this._defaultEmitter.emit('web3/AUTHENTICATED', {
      account: this.currentAddress()
    });
    this._installDeauthenticationCheck();
  }

  /*
    sendTransaction in web3 1.0 behaves differently from its counterpart in
    0.2x.x. it doesn't resolve until the transaction has a receipt, and throws an
    error if the receipt indicates that the transaction was reverted.
    the setup below emulates the old behavior, because TransactionObject still
    expects it. if there is an error due to the transaction being reverted, it
    will be ignored, because the promise will have already resolved.

    this can (and should) be refactored when we drop support for HTTP providers.

    https://github.com/ethereum/wiki/wiki/JavaScript-API#web3ethsendtransaction
    https://web3js.readthedocs.io/en/1.0/web3-eth.html#sendtransaction
  */
  sendTransaction(...args) {
    return new Promise((resolve, reject) => {
      this._web3.eth
        .sendTransaction(...args)
        .on('transactionHash', resolve)
        .on('error', reject);
    });
  }

  get network() {
    return this._info.network;
  }

  get networkName() {
    return getNetworkName(this.networkId());
  }

  get rpcUrl() {
    return last(this._web3.currentProvider._providers).rpcUrl;
  }

  blockNumber() {
    return this._currentBlock;
  }

  _listenForNewBlocks() {
    if (this.usingWebsockets()) {
      this._newBlocksSubscription = this.subscribe('newBlockHeaders').on(
        'data',
        data => this._updateBlockNumber(data.number)
      );
    } else {
      const updateBlocks = async () => {
        const blockNumber = await this._web3.eth.getBlockNumber();
        if (!this._currentBlock) this._currentBlock = blockNumber - 1;
        for (let i = this._currentBlock + 1; i <= blockNumber; i++) {
          this._updateBlockNumber(i);
        }
      };
      this._updateBlocksInterval = setInterval(
        updateBlocks,
        this._pollingInterval
      );
    }
  }

  onNewBlock(callback) {
    if (!this._blockListeners['*']) {
      this._blockListeners['*'] = [];
    }

    this._blockListeners['*'].push(callback);
  }

  async waitForBlockNumber(blockNumber) {
    if (blockNumber < this._currentBlock) {
      console.error('Attempted to wait for past block ' + blockNumber);
      return;
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
    this.get('log').info('New block:', blockNumber);

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

  _removeBlockUpdates() {
    if (this.usingWebsockets()) {
      this._newBlocksSubscription.unsubscribe((err, success) => {
        if (!success) throw new Error(err);
      });
    } else {
      clearInterval(this._updateBlocksInterval);
    }
  }

  _installCleanUpHooks() {
    this.manager().onDisconnected(() => {
      this._removeBlockUpdates();
      this.get('timer').disposeTimer(TIMER_CONNECTION);
    });

    this.manager().onDeauthenticated(() => {
      this.get('timer').disposeTimer(TIMER_AUTHENTICATION);
    });
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
    // only determine network change as disconnect if service is connected
    if (!this.manager().isConnected()) {
      return false;
    }
    return promisify(this._web3.eth.net.getId)()
      .then(network => network === this._info['network'])
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
    return account === this.currentAddress();
  }
}
