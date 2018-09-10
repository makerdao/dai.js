import PublicService from '../core/PublicService';
import TransactionObject from './TransactionObject';
import merge from 'lodash.merge';
import { Contract } from 'ethers';
import { dappHub } from '../../contracts/abi';
import { wrapContract } from '../utils';

let txId = 1;

export default class TransactionManager extends PublicService {
  constructor(name = 'transactionManager') {
    super(name, ['web3', 'log', 'nonce']);
    this._transactions = [];
    this._listeners = [];
  }

  formatHybridTx(contract, key, args, name, businessObject = null) {

    // Strip the key to just the method name (in cases where the method was called
    // using the full method sig e.g. contract["draw(address,uint256)"](foo, bar)
    const method = key.replace(/\(.*\)$/g, '');
    const metadata = { contract: name, method, args };
    let dsProxyAddress = null;

    if (typeof args !== 'undefined' && Array.isArray(args) && typeof args[args.length - 1] === 'object') {

      // Detect additional metadata attatched to last arg and merge it with default metadata
      if (args[args.length - 1].hasOwnProperty('metadata')) {
        Object.assign(metadata, args[args.length - 1].metadata);
        delete args[args.length - 1].metadata;
      }

      // Detect proxy address and route through DSProxy contract
      if (args[args.length - 1].hasOwnProperty('dsProxyAddress')) {
        dsProxyAddress = args[args.length - 1].dsProxyAddress;
        delete args[args.length - 1].dsProxyAddress;
        this.get('log').debug('Using DSProxy ' + dsProxyAddress + ' for this tx');
      }

      // If last arg item is an empty object, remove it
      if (Object.keys(args[args.length - 1]).length === 0) args.pop();
    }

    // DSProxy handling – different from the fact that this class is called Proxy ;)
    if (dsProxyAddress !== null) {
      const dsProxyContract = wrapContract(
        new Contract(
          dsProxyAddress,
          dappHub.dsProxy,
          this.get('web3').ethersSigner()
        ),
        'DSProxy',
        dappHub.dsProxy,
        this
      );

      // Pass in any additional tx options passed to this tx (e.g. value, gasLimit)
      // if the last arg is an object literal (not a BigNumber object etc.)
      let options = {};
      if (typeof args[args.length - 1] === 'object' && args[args.length - 1].constructor === Object) {
        Object.assign(options, args[args.length - 1]);
        args.pop();
      }
      // Assign proxied tx metadata and options to proxy tx
      Object.assign(options, { metadata });

      this.get('log').debug('Calling ' + key + ' via DSProxy at ' + dsProxyAddress);

      // Get proxied tx calldata to pass to DSProxy
      const data = contract.interface.functions[key](...args).data;
      return dsProxyContract.execute(contract.address, data, options);
    }

    const contractCall = this.injectSettings(args).then(newArgs =>
      contract[key](...newArgs)
    );

    return this.createHybridTx(contractCall, {
      businessObject: businessObject,
      metadata
    });
  }

  async injectSettings(args) {
    const settings = await this.getSettings();

    if (
      typeof args[args.length - 1] === 'object' &&
      !Object.keys(args[args.length - 1]).includes('_bn')
    ) {
      await merge(args[args.length - 1], settings);
    } else {
      args.push(settings);
    }
    return args;
  }

  async getSettings() {
    const nonce = await this.get('nonce').getNonce();
    const options = this.get('web3').transactionSettings();
    const settings = { nonce: nonce };

    if (options) {
      Object.keys(options).map(option => {
        settings[option] = options[option];
      });
    }

    return settings;
  }

  // FIXME: a method that returns one thing when it's called in a promise chain
  // and something else when it's not (besides a promise that resolves to the
  // first thing) is pretty difficult to work with.
  createHybridTx(tx, { businessObject, parseLogs, metadata } = {}) {
    if (tx._original) {
      console.warn('Redundant call to createHybridTx');
      return tx;
    }

    const txo = new TransactionObject(
      tx,
      this.get('web3'),
      this.get('nonce'),
      businessObject,
      parseLogs
    );

    const hybrid = txo.mine().then(() => txo.onMined());
    Object.assign(
      hybrid,
      {
        _original: txo,
        getOriginalTransaction: () => txo,
        _txId: txId++,
        metadata // put whatever you want in here for inspecting/debugging
      },
      [
        'mine',
        'confirm',
        'state',
        'isPending',
        'isMined',
        'isFinalized',
        'isError',
        'onPending',
        'onMined',
        'onFinalized',
        'onError'
      ].reduce((acc, method) => {
        acc[method] = (...args) => txo[method](...args);
        return acc;
      }, {})
    );

    this._transactions.push(hybrid);
    this._listeners.forEach(cb => cb(hybrid));

    return hybrid;
  }

  getTransactions() {
    return this._transactions;
  }

  onNewTransaction(callback) {
    this._listeners.push(callback);
  }
}
