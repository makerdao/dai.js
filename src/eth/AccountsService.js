import PublicService from '../core/PublicService';
import { map, omit, pick } from 'lodash/fp';
import invariant from 'invariant';
import {
  privateKeyAccountFactory,
  providerAccountFactory,
  browserProviderAccountFactory
} from './accounts/factories';
import { setupEngine } from './accounts/setup';
import { AccountType } from '../utils/constants';

export default class AccountsService extends PublicService {
  constructor(name = 'accounts') {
    super(name, []);
    this._accounts = {};
    this._accountFactories = {
      privateKey: privateKeyAccountFactory,
      provider: providerAccountFactory,
      browser: browserProviderAccountFactory
    };
  }

  async initialize(settings = {}) {
    this._settings = omit('web3', settings);

    const result = await setupEngine(settings);
    this._engine = result.engine;
    this._provider = result.provider;
  }

  async connect() {
    const accountNames = Object.keys(this._settings);
    for (const name of accountNames) {
      await this.addAccount(name, this._settings[name]);
    }
    if (accountNames.length === 0) {
      await this.addAccount('default', { type: AccountType.PROVIDER });
    }
    this._engine.start();
  }

  getProvider() {
    return this._engine;
  }

  addAccountType(type, factory) {
    invariant(
      !this._accountFactories[type],
      `Account type "${type}" is already defined`
    );
    this._accountFactories[type] = factory;
  }

  async addAccount(name, { type, ...otherSettings }) {
    invariant(this._engine, 'engine must be set up before adding an account');
    if (this._accounts[name]) {
      throw new Error('An account with this name already exists.');
    }
    const factory = this._accountFactories[type];
    invariant(factory, `no factory for type "${type}"`);
    const accountData = await factory(otherSettings, this._provider);
    const account = { name, type, ...accountData };
    this._accounts[name] = account;
    if (!this._currentAccount || name === 'default') {
      this.useAccount(name);
    }
    return account;
  }

  listAccounts() {
    return map(pick(['name', 'type', 'address']), this._accounts);
  }

  useAccount(name) {
    invariant(this._accounts[name], `No account found with name "${name}".`);

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
    return !!this._currentAccount;
  }

  hasNonProviderAccount() {
    return (
      this.hasAccount() && this.currentAccount().type != AccountType.PROVIDER
    );
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
