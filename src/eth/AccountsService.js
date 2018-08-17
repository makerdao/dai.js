import PublicService from '../core/PublicService';
import ethUtil from 'ethereumjs-util';

export default class AccountsService extends PublicService {
  constructor(name = 'accounts') {
    super(name, []);
    this._accounts = {};
  }

  initialize(accountSettings = {}) {
    // handle at least 3 cases:
    //   - if there is nothing, define a "provider" account
    //     that will defer to the provider
    //   - if there is an item with a private key, set up a simple wallet
    //   - if there is an item with a different type, set up a wallet according
    //     to that type's definition

    for (const name of Object.keys(accountSettings)) {
      const { type, value } = accountSettings[name];
      let account;

      switch (type) {
        case 'privateKey':
          if (!value || !value.match(/^0x[0-9a-fA-F]{64}$/)) {
            throw new Error('Invalid private key format');
          }

          account = {
            type,
            privateKey: Buffer.from(value.replace(/^0x/, ''), 'hex'),
            address: '0x' + ethUtil.privateToAddress(value).toString('hex')
          };
          break;
      }

      this._accounts[name] = account;

      if (!this._currentAccount || name === 'default') {
        this._currentAccount = account;
      }
    }
  }

  // TODO:
  // addAccountType(type, config) {
  //
  // }
  //
  // addAccount(name, options) {
  //
  // }
  //
  // useAccount(name) {
  //
  // }

  hasAccount() {
    return !!this._currentAccount;
  }

  currentAddress() {
    if (!this.hasAccount()) throw new Error('No account is set up.');
    return this._currentAccount.address;
  }

  currentPrivateKey(format) {
    if (!this.hasAccount()) throw new Error('No account is set up.');
    const { privateKey } = this._currentAccount;
    return format === 'hex' ? privateKey.toString('hex') : privateKey;
  }
}
