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
import assert from 'assert';
import debug from 'debug';
const log = debug('dai:AccountsService');

const sanitizeAccount = pick(['name', 'type', 'address']);

export default class AccountsService extends PublicService {
  constructor(name = 'accounts') {
    super(name, ['event']);
    this._accounts = {};
    this._accountFactories = {
      privateKey: privateKeyAccountFactory,
      provider: providerAccountFactory,
      browser: browserProviderAccountFactory
    };
  }

  async initialize(settings = {}) {
    this._settings = omit('web3', settings);

    const provider = await setupEngine(settings);
    this._provider = provider;
  }

  async connect() {
    const accountNames = Object.keys(this._settings);
    for (const name of accountNames) {
      await this.addAccount(name, this._settings[name]);
    }
    if (accountNames.length === 0) {
      await this.addAccount('default', { type: AccountType.PROVIDER });
    }
    // this._engine.start();
  }

  getProvider() {
    // return this._engine;
    return this._provider;
  }

  getSigner() {
    // return this._engine;
    return this._signer;
  }

  addAccountType(type, factory) {
    invariant(
      !this._accountFactories[type],
      `Account type "${type}" is already defined`
    );
    this._accountFactories[type] = factory;
  }

  //TODO reduce complexity of addAccount:
  /* eslint-disable */
  async addAccount(name, options = {}) {
    if (name && typeof name !== 'string') {
      options = name;
      name = null;
    }
    const { type, autoSwitch, ...otherSettings } = options;
    // invariant(this._engine, 'engine must be set up before adding an account');
    if (name && this._accounts[name]) {
      throw new Error('An account with this name already exists.');
    }
    const factory = this._accountFactories[type];
    invariant(factory, `no factory for type "${type}"`);
    const accountData = await factory(otherSettings, this._provider);

    // TODO allow this to silently fail only in situations where it's expected,
    // e.g. when connecting to a read-only provider
    if (!accountData.address) {
      log(`Not adding account "${name}" (no address found)`);
      return;
    }
    accountData.address = accountData.address.toLowerCase();

    if (this._getAccountWithAddress(accountData.address)) {
      throw new Error('An account with this address already exists.');
    }

    if (!name) name = accountData.address;
    const account = {
      name,
      type,
      autoSwitch: autoSwitch || false,
      ...accountData
    };

    // TODO: This seems to work, but is it the best implementation?
    this._signer = accountData.subprovider._isProvider
      ? accountData.subprovider.getSigner()
      : accountData.subprovider;

    this._accounts[name] = account;
    if (!this._currentAccount || name === 'default') {
      this.useAccount(name);
    }
    if (this.hasAccount()) {
      this.get('event').emit('accounts/ADD', {
        account: sanitizeAccount(account)
      });
    }

    return account;
  }

  listAccounts() {
    return map(sanitizeAccount, this._accounts);
  }

  useAccount(name) {
    const account = this._accounts[name];
    invariant(account, `No account found with name "${name}".`);

    if (this._autoSwitchCheckHandle) clearInterval(this._autoSwitchCheckHandle);

    if (account.type === AccountType.BROWSER) {
      assert(
        isAddressSelected(account.address),
        'cannot use a browser account that is not currently selected'
      );
      // detect account change and automatically switch active account if
      // autoSwitch flag set (useful if using a browser wallet like MetaMask)
      // see: https://github.com/MetaMask/faq/blob/master/DEVELOPERS.md#ear-listening-for-selected-account-changes
      if (account.autoSwitch) {
        this._autoSwitchCheckHandle = setInterval(
          this._autoSwitchCheckAccountChange(account.address),
          500
        );
      }
    }

    // TODO fix this later
    // if (this._currentAccount) {
    //   this._engine.stop();
    //   this._engine.removeProvider(this.currentWallet());
    // }

    this._currentAccount = name;
    // add the provider at index 0 so that it takes precedence over RpcSource

    /**
     * How this used to work:
     * we create the engine, and web3 service references this.
     * then we might change accounts (signer)
     * we push the new signer to the engine
     * web3 service maintains a reference to the signer (engine)
     * so it is able to read the newly pushed signer
     *
     * our task is to update the signer in web3Service when it changes
     *
     */

    // this._engine.push(this.currentWallet(), 0);
    // this._engine.addProvider(this.currentWallet(), 0);
    // this._engine.start();
    if (this.hasAccount()) {
      this.get('event').emit('accounts/CHANGE', {
        account: this.currentAccount()
      });
    }
  }

  _autoSwitchCheckAccountChange(addr) {
    return async () => {
      const activeBrowserAddress = getSelectedAddress().toLowerCase();
      if (activeBrowserAddress !== addr) {
        if (!this._getAccountWithAddress(activeBrowserAddress)) {
          await this.addAccount({
            type: AccountType.BROWSER,
            autoSwitch: true
          });
        }
        this.useAccountWithAddress(activeBrowserAddress);
      }
    };
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

function getSelectedAddress() {
  return typeof window.ethereum !== 'undefined'
    ? window.ethereum.selectedAddress
    : window.web3.eth.defaultAccount;
}

function isAddressSelected(address) {
  // if using browser/MetaMask, we must use the currently selected account;
  // however, it can be blank the first time the user connects their account.
  const selectedAddress = getSelectedAddress();
  return !selectedAddress || selectedAddress.toLowerCase() === address;
}
