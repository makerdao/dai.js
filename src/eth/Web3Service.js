import PrivateService from '../core/PrivateService';
import { promisify, getNetworkName } from '../utils';
import Web3ServiceList from '../utils/Web3ServiceList';
import promiseProps from 'promise-props';
import Web3 from 'web3';
import ProviderType from './web3/ProviderType';
import makeSigner from './web3/ShimEthersSigner';
import getMatchingEvent from './web3/LogEvent';

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
    this._info = {};
    this._statusTimerDelay = TIMER_DEFAULT_DELAY;
    this._defaultEmitter = null;
    this._transactionSettings = null;
    this._blockSub = null;
    this._interval = null;
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

  // FIXME this name is confusing--see if this can be gotten rid of entirely; if
  // not, just rename it to currentAddress
  currentAccount() {
    return this.get('accounts').currentAddress();
  }

  ethersProvider() {
    try {
      throw new Error('hi');
    } catch (err) {
      console.warn(
        'using ethers provider is deprecated...\n' +
          err.stack
            .split('\n')
            .slice(1, 7)
            .join('\n')
      );
    }
    return this._ethersProvider;
  }

  getEthersSigner() {
    if (this.usingWebsockets()) {
      if (!this._ethersSigner) this._ethersSigner = makeSigner(this);
      return this._ethersSigner;
    } else {
      return this._ethersProvider.getSigner();
    }
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

  subscribeNewBlocks(cb) {
    this._blockSub = this.subscribe('newBlockHeaders').on(
      'data',
      blockHeader => {
        cb(blockHeader);
      }
    );
  }

  unsubscribeNewBlocks() {
    this._blockSub.unsubscribe((err, success) => {
      if (!success) throw new Error(err);
    });
  }

  waitForMatchingEvent(info, event, predicate = () => true, timeout = 30000) {
    return getMatchingEvent(this._web3, info, event, timeout, predicate);
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
        'getBalance',
        'getBlock',
        'getPastLogs',
        'getTransaction',
        'getTransactionReceipt'
      ].reduce((acc, method) => {
        acc[method] = (...args) => this._web3.eth[method](...args);
        return acc;
      }, {}),
      {
        getAccounts: () =>
          this.get('accounts')
            .listAccounts()
            .map(account => {
              return account.address;
            }),
        subscribe: (...args) => this._web3.eth.subscribe(...args)
      }
    );

    this._listenBlocks();

    this._setStatusTimerDelay(settings.statusTimerDelay);
    this._installCleanUpHooks();
    this._defaultEmitter.emit('web3/INITIALIZED', {
      provider: { ...settings.provider }
    });
    this._transactionSettings = settings.transactionSettings;
    this._confirmedBlockCount = settings.confirmedBlockCount || 5;
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

    // FIXME set up block listening with web3 instead
    this._setUpEthers(this.networkId());

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
      account: this.currentAccount()
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

  getNetwork() {
    return this._info.network;
  }

  blockNumber() {
    return this._currentBlock;
  }

  async _listenBlocks() {
    if (this.usingWebsockets()) {
      this.subscribeNewBlocks(async data => {
        await this._updateBlockNumber(data.number);
      });
      this._currentBlock = await this._web3.eth.getBlockNumber();
    } else {
      const updateBlocks = async () => {
        const blockNumber = await this._web3.eth.getBlockNumber();
        if (this._currentBlock !== null && blockNumber > this._currentBlock) {
          // If any blocks are not caught, iterate through those that are missed to the newest retrieved
          for (let i = this._currentBlock + 1; i < blockNumber + 1; i++) {
            await this._updateBlockNumber(i);
          }
        } else {
          await this._updateBlockNumber(blockNumber);
        }
        this._interval = setTimeout(updateBlocks, 50);
      };
      updateBlocks();
    }
  }

  onNewBlock(callback) {
    if (!this._blockListeners['*']) {
      this._blockListeners['*'] = [];
    }

    this._blockListeners['*'].push(callback);
  }

  onBlock(number, callback) {
    // schedule a function to execute on a block ahead in time
    if (number < this.blockNumber()) {
      throw new Error('cannot schedule a callback back in time');
    }

    if (!this._blockListeners[number]) {
      this._blockListeners[number] = [];
    }

    this._blockListeners[number].push(callback);
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

    return new Promise(resolve => {
      this._currentBlock = blockNumber;
      if (this._blockListeners[blockNumber]) {
        this._blockListeners[blockNumber].forEach(c => c(blockNumber));
        this._blockListeners[blockNumber] = undefined;
      }

      if (this._blockListeners['*']) {
        this._blockListeners['*'].forEach(c => c(blockNumber));
      }
      resolve();
    });
  }

  _initEventPolling() {
    this.onNewBlock(this.get('event').ping);
  }

  _removeBlockUpdates() {
    if (this.usingWebsockets()) {
      this.unsubscribeNewBlocks();
    } else {
      clearTimeout(this._interval);
    }
  }

  _installCleanUpHooks() {
    this.manager().onDisconnected(() => {
      this._removeBlockUpdates();
      this.get('timer').disposeTimer(TIMER_CONNECTION);
    });

    this.manager().onDeauthenticated(() => {
      this._removeBlockUpdates();
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
    return account === this.currentAccount();
  }
}
