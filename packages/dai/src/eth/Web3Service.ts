import { PrivateService } from '@makerdao/services-core';
import { getNetworkName } from '../utils';
import Web3ServiceList from '../utils/Web3ServiceList';
// import Web3 from 'web3';
import { ethers } from 'ethers';
// import makeSigner from './web3/ShimEthersSigner';
// import last from 'lodash/last';
import assert from 'assert';
import debug from 'debug';
const log = debug('dai:Web3Service');

export default class Web3Service extends PrivateService {
  _blockListeners;
  _info;
  _ethersSigner;
  _ethersProvider;
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
  _utils;

  constructor(name = 'web3') {
    super(name, ['accounts', 'timer', 'cache', 'event']);

    this._blockListeners = {};
    this._info = {};
    Web3ServiceList.push(this);
    this._utils = ethers.utils;
  }

  currentAddress() {
    return this.get('accounts').currentAddress();
  }

  getEthersSigner() {
    return this.get('accounts').getSigner();
    // if (!this._ethersSigner)
    //   this._ethersSigner = this.get('accounts').getSigner();
    // return this._ethersSigner;
  }

  web3Provider() {
    return this.get('accounts').getProvider();
    // return this._web3.currentProvider;
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

    this._ethersProvider = this.get('accounts').getProvider();
    this._ethersSigner = this.get('accounts').getSigner();

    // this._web3 = new Web3();
    // this._web3.setProvider(this.get('accounts').getProvider());

    //TODO make sure all the methods listed here are added to this class below
    // Object.assign(
    //   this,
    //   [
    //     'estimateGas',
    //     // 'getAccounts',
    //     'listAccounts',
    //     'getBalance', // yes
    //     'getBlock', // yes
    //     'getPastLogs',
    //     'getStorageAt', // yes
    //     'getTransaction', // yes
    //     'getTransactionReceipt', // yes
    //     'subscribe'
    //   ].reduce((acc, method) => {
    //     acc[method] = (...args) => this._ethersProvider[method](...args);
    //     return acc;
    //   }, {})
    // );

    this.manager().onDisconnected(() => this._stopListeningForNewBlocks());
    this._defaultEmitter.emit('web3/INITIALIZED', {
      provider: settings.provider
    });
    this._transactionSettings = settings.transactionSettings;
    this._confirmedBlockCount = settings.confirmedBlockCount || 5;
    this._pollingInterval = settings.pollingInterval || 4000;
  }

  subscribe(...args) {
    return this._ethersProvider.subscribe(...args);
  }

  estimateGas(...args) {
    return this._ethersProvider.estimateGas(...args);
  }

  wait(...args) {
    return this._ethersProvider.wait(...args);
  }

  getBalance(...args) {
    return this._ethersProvider.getBalance(...args);
  }

  getAccounts(...args) {
    //TODO does it need to be spread?
    return this._ethersProvider.listAccounts(...args);
  }

  getBlock(...args) {
    return this._ethersProvider.getBlock(...args);
  }

  getPastLogs(...args) {
    return this._ethersProvider.getPastLogs(...args);
  }

  getStorageAt(...args) {
    return this._ethersProvider.getStorageAt(...args);
  }

  getTransaction(...args) {
    return this._ethersProvider.getTransaction(...args);
  }

  getTransactionReceipt(...args) {
    return this._ethersProvider.getTransactionReceipt(...args);
  }

  async connect() {
    log('connecting...');

    this._networkId = (await this._ethersProvider.getNetwork()).chainId;
    this._currentBlock = await this._ethersProvider.getBlockNumber();
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
    return this._ethersProvider.getSigner().sendTransaction(...args);
    // return new Promise((resolve, reject) => {
    //   this._ethersProvider
    //     .sendTransaction(...args)
    //     .on('transactionHash', resolve)
    //     .on('error', reject);
    // });
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
    const provider = this.web3Provider();
    return (provider as any).connection.url || null;
  }

  get utils() {
    return this._utils;
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
      this._newBlocksSubscription = this._ethersProvider.on(
        'block',
        blockNumber => {
          if (!this._currentBlock) this._currentBlock = blockNumber - 1;
          for (let i = this._currentBlock + 1; i <= blockNumber; i++) {
            this._updateBlockNumber(i);
          }
        }
      );
    } else {
      log('Using manual getBlockNumber polling for block detection');
      const updateBlocks = async () => {
        const blockNumber = await this._ethersProvider.getBlockNumber();
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
