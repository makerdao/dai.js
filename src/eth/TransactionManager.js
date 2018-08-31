import PublicService from '../core/PublicService';
import TransactionObject from './TransactionObject';
import ObjectWrapper from '../utils/ObjectWrapper';
import merge from 'lodash.merge';

let txId = 1;

export default class TransactionManager extends PublicService {
  constructor(name = 'transactionManager') {
    super(name, ['web3', 'log', 'nonce']);
    this._transactions = [];
    this._listeners = [];
  }

  formatHybridTx(contract, key, args, name, businessObject = null) {
    const contractCall = this.injectSettings(args).then(newArgs =>
      contract[key](...newArgs)
    );
    return this.createHybridTx(contractCall, {
      businessObject: businessObject,
      metadata: { contract: name, method: key, args }
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

  // FIXME: having a method that returns one thing when it's called in a promise
  // chain and something else when it's not (besides a promise that resolves to
  // the first thing) makes it pretty difficult to work with.
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
    Object.assign(hybrid, {
      _original: txo,
      getOriginalTransaction: () => txo,
      _txId: txId++,
      metadata // put whatever you want in here for inspecting/debugging
    });

    if (businessObject) {
      ObjectWrapper.addWrapperInterface(hybrid, businessObject);
    }

    ObjectWrapper.addWrapperInterface(hybrid, txo, [
      'logs',
      'hash',
      'fees',
      'timeStamp',
      'timeStampSubmitted'
    ]);

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
