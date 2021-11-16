import { PrivateService } from '@makerdao/services-core';
import { promisify, getNetworkName } from '../utils';
import Web3ServiceList from '../utils/Web3ServiceList';
import Web3 from 'web3';
import makeSigner from './web3/ShimEthersSigner';
import { last } from 'lodash';
import assert from 'assert';
import debug from 'debug';
const log = debug('dai:Web3Service');

export default class Web3Service extends PrivateService {
  _blockListeners;
  _info;
  _ethersSigner;
  _web3;
  _transactionSettings;
  _confirmedBlockCount;
  _defaultEmitter;
  eth;
  _pollingInterval;
  _networkId;
  _currentBlockId;
  _currentBlock;
  _newBlocksSubscription;
  _updateBlocksInterval;

  constructor(name = 'web3') {
    super(name, ['accounts', 'timer', 'cache', 'event']);

    this._blockListeners = {};
    this._info = {};
    Web3ServiceList.push(this);
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

  confirmedBlockCount() {
    return this._confirmedBlockCount;
  }

  web3Contract(abi, address) {
    return new this._web3.eth.Contract(abi, address);
  }

  initialize(settings) {
    log('initializing...');
    this._defaultEmitter = this.get('event');

    this._web3 = new Web3();
    this._web3.setProvider(this.get('accounts').getProvider());

    this.eth = new Proxy(this, {
      get(target, key) {
        if (typeof key === 'string')
          console.warn(`use .${key} instead of .eth.${key}`);
        return target[key];
      }
    });

    this.manager().onDisconnected(() => this._stopListeningForNewBlocks());
    this._defaultEmitter.emit('web3/INITIALIZED', {
      provider: settings.provider
    });
    this._transactionSettings = settings.transactionSettings;
    this._confirmedBlockCount = settings.confirmedBlockCount || 5;
    this._pollingInterval = settings.pollingInterval || 4000;
  }

  subscribe(...args) {
    return this._web3.eth.subscribe(...args);
  }

  estimateGas(...args) {
    return this._web3.eth.estimateGas(...args);
  }

  wait(...args) {
    return this._web3.eth.wait(...args);
  }

  getBalance(...args) {
    return this._web3.eth.getBalance(...args);
  }

  getAccounts(...args) {
    return this._web3.eth.getAccounts(...args);
  }

  getBlock(...args) {
    return this._web3.eth.getBlock(...args);
  }

  getPastLogs(...args) {
    return this._web3.eth.getPastLogs(...args);
  }

  getStorageAt(...args) {
    return this._web3.eth.getStorageAt(...args);
  }

  getTransaction(...args) {
    return this._web3.eth.getTransaction(...args);
  }

  getTransactionReceipt(...args) {
    return this._web3.eth.getTransactionReceipt(...args);
  }

  async connect() {
    log('connecting...');

    this._networkId = parseInt(await promisify(this._web3.eth.net.getId)());
    this._currentBlock = await this._web3.eth.getBlockNumber();
    this._updateBlockNumber(this._currentBlock);
    this._listenForNewBlocks();

    this.onNewBlock(this.get('event').ping);
    this._defaultEmitter.emit('web3/CONNECTED', {
      ...this._info
    });
  }

  async authenticate() {
    log('authenticating...');

    this._defaultEmitter.emit('web3/AUTHENTICATED', {
      account: this.currentAddress()
    });
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
        .on('transactionHash', tx => {
          return resolve({
            hash: tx,
            // ethers TransactionResponse expects a wait method
            wait: () => {}
          });
        })
        .on('error', reject);
    });
  }

  networkId() {
    console.warn('.networkId() is deprecated; use .network instead');
    return this.network;
  }

  get network() {
    assert(this._networkId, 'Cannot resolve network ID. Are you connected?');
    return this._networkId;
  }

  get networkName() {
    return getNetworkName(this.network);
  }

  get rpcUrl() {
    const provider = last(this._web3.currentProvider._providers);
    return (provider as any).rpcUrl || (provider as any)._url || null;
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

  _listenForNewBlocks() {
    if (this.networkName !== 'test') {
      log('Using newBlockHeaders subscription for block detection');
      this._newBlocksSubscription = this.subscribe('newBlockHeaders').on(
        'data',
        ({ number: blockNumber }) => {
          if (!this._currentBlock) this._currentBlock = blockNumber - 1;
          for (let i = this._currentBlock + 1; i <= blockNumber; i++) {
            this._updateBlockNumber(i);
          }
        }
      );
    } else {
      log('Using manual getBlockNumber polling for block detection');
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

  _updateBlockNumber(blockNumber) {
    log(`Latest block: ${blockNumber}`);

    this._currentBlock = blockNumber;
    if (this._blockListeners[blockNumber]) {
      this._blockListeners[blockNumber].forEach(c => c(blockNumber));
      this._blockListeners[blockNumber] = undefined;
    }

    if (this._blockListeners['*']) {
      this._blockListeners['*'].forEach(c => c(blockNumber));
    }
  }

  _stopListeningForNewBlocks() {
    if (this._newBlocksSubscription) {
      this._newBlocksSubscription.unsubscribe(err => {
        if (err) throw err;
      });
    } else if (this._updateBlocksInterval) {
      clearInterval(this._updateBlocksInterval);
    }
  }
}
