import PublicService from '../core/PublicService';
import ethUtil from 'ethereumjs-util';
import Wallet from 'web3-provider-engine/dist/es5/subproviders/wallet';
import { map, pick } from 'lodash/fp';
import invariant from 'invariant';

function privateKeyAccountFactory({ key }) {
  if (typeof key != 'string' || !key.match(/^(0x)?[0-9a-fA-F]{64}$/)) {
    throw new Error('Invalid private key format');
  }

  const [keyWithPrefix, keySansPrefix] = key.startsWith('0x')
    ? [key, key.replace(/^0x/, '')]
    : ['0x' + key, key];

  const address =
    '0x' + ethUtil.privateToAddress(keyWithPrefix).toString('hex');
  const keyBuffer = Buffer.from(keySansPrefix, 'hex');

  const subprovider = new Wallet(
    { getAddressString: () => address, getPrivateKey: () => keyBuffer },
    {}
  );

  return { subprovider, address };
}

export default class AccountsService extends PublicService {
  constructor(name = 'accounts') {
    super(name, []);
    this._accounts = {};
    this._accountFactories = {
      privateKey: privateKeyAccountFactory
    };
  }

  async initialize(settings = {}) {
    for (const name of Object.keys(settings)) {
      await this.addAccount(name, settings[name]);
    }
  }

  addAccountType(type, factory) {
    invariant(
      !this._accountFactories[type],
      `Account type "${type}" already defined`
    );
    this._accountFactories[type] = factory;
  }

  async addAccount(name, { type, ...otherSettings }) {
    const factory = this._accountFactories[type];
    const account = { name, type, ...(await factory(otherSettings)) };
    this._accounts[name] = account;
    if (
      (!this._currentAccount && !this._deferredUseAccount) ||
      name === 'default'
    ) {
      this.useAccount(name);
    }
    return account;
  }

  // this is part of AccountsService initialization, but it can't be put into
  // the initialize method, because it depends upon Web3Service, and adding
  // Web3Service as a dependency would create a dependency loop.
  attachToEngine(engine) {
    invariant(!this._engine, 'attachToEngine should only be called once.');
    this._engine = engine;
    if (this._deferredUseAccount) {
      this.useAccount(this._deferredUseAccount);
    } else {
      this._engine.start();
    }
  }

  listAccounts() {
    return map(pick(['name', 'type', 'address']), this._accounts);
  }

  useAccount(name) {
    invariant(this._accounts[name], `No account found with name "${name}".`);

    // if useAccount is called during setup, before the provider engine is
    // available, we need to make sure it is run again once the provider engine
    // becomes available.
    if (!this._engine) {
      this._deferredUseAccount = name;
      return;
    }

    if (this._currentAccount) {
      this._engine.stop();
      this._engine.removeProvider(this.currentWallet());
    }

    this._currentAccount = name;
    // add the provider at index 0 so that it takes precedence over RpcSource
    this._engine.addProvider(this.currentWallet(), 0);
    this._engine.start();
  }

  hasAccount() {
    invariant(this._engine, 'attachToEngine has not been run yet.');
    return !!this._currentAccount;
  }

  // we intentionally omit subprovider (implementation detail) and privateKey
  // (sensitive info).
  currentAccount() {
    invariant(this.hasAccount(), 'No account is set up.');
    return pick(
      ['name', 'type', 'address'],
      this._accounts[this._currentAccount]
    );
  }

  currentAddress() {
    invariant(this.hasAccount(), 'No account is set up.');
    return this._accounts[this._currentAccount].address;
  }

  currentWallet() {
    return this._accounts[this._currentAccount].subprovider;
  }
}
