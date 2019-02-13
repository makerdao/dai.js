import { PublicService } from '@makerdao/services-core';
import { map, omit, pick } from 'lodash/fp';
import invariant from 'invariant';
import {
  privateKeyAccountFactory,
  providerAccountFactory,
  browserProviderAccountFactory
} from './accounts/factories';
import { setupEngine } from './accounts/setup';
import { AccountType } from '../utils/constants';

const sanitizeAccount = pick(['name', 'type', 'address']);

export default class AccountsService extends PublicService {
  constructor(name = 'accounts') {
    super(name, ['log', 'event']);
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

  async addAccount(name, options = {}) {
    if (name && typeof name !== 'string') {
      options = name;
      name = null;
    }
    const { type, ...otherSettings } = options;
    invariant(this._engine, 'engine must be set up before adding an account');
    if (name && this._accounts[name]) {
      throw new Error('An account with this name already exists.');
    }
    const factory = this._accountFactories[type];
    invariant(factory, `no factory for type "${type}"`);
    const accountData = await factory(otherSettings, this._provider);

    // TODO allow this to silently fail only in situations where it's expected,
    // e.g. when connecting to a read-only provider
    if (!accountData.address) {
      this.get('log').info(`Not adding account "${name}" (no address found)`);
      return;
    }
    if (this._getAccountWithAddress(accountData.address)) {
      throw new Error('An account with this address already exists.');
    }

    if (!name) name = accountData.address;
    const account = { name, type, ...accountData };
    this._accounts[name] = account;
    if (!this._currentAccount || name === 'default') {
      this.useAccount(name);
    }

    this.get('event').emit('accounts/ADD', { account: sanitizeAccount(account) });

    return account;
  }

  listAccounts() {
    return map(sanitizeAccount, this._accounts);
  }

  useAccount(name) {
    const account = this._accounts[name];
    invariant(account, `No account found with name "${name}".`);
    //if using metamask, need to use the currently selected account
    if (
      account.type === AccountType.BROWSER &&
      window.web3.eth.defaultAccount.toLowerCase() !=
        account.address.toLowerCase()
    ) {
      throw new Error(
        'cannot use a browser account that is not currently selected'
      );
    }

    if (this._currentAccount) {
      this._engine.stop();
      this._engine.removeProvider(this.currentWallet());
    }

    this._currentAccount = name;
    // add the provider at index 0 so that it takes precedence over RpcSource
    this._engine.addProvider(this.currentWallet(), 0);
    this._engine.start();

    this.get('event').emit('accounts/CHANGE', { account: this.currentAccount() });
  }

  _getAccountWithAddress(addr) {
    const accountObjects = Object.values(this._accounts);
    return accountObjects.find(
      e => e.address.toUpperCase() === addr.toUpperCase()
    );
  }

  useAccountWithAddress(addr) {
    const account = this._getAccountWithAddress(addr);
    if (!account) throw new Error(`No account found with address ${addr}`);
    this.useAccount(account.name);
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
    return sanitizeAccount(this._accounts[this._currentAccount]);
  }

  currentAddress() {
    invariant(this.hasAccount(), 'No account is set up.');
    return this._accounts[this._currentAccount].address;
  }

  currentWallet() {
    return this._accounts[this._currentAccount].subprovider;
  }
}
