import accounts from './testAccounts';

/**
 *
 */
class TestAccountProvider {

  constructor(accounts, initialIndex = 0) {
    this._setAccounts(accounts);
    this.setIndex(initialIndex);
  }

  nextAddress() {
    return this._next().address;
  }

  nextAccount() {
    return this._next();
  }

  getIndex() {
    return this._index;
  }

  setIndex(i) {
    if (typeof i !== 'number' || i < 0 || i >= this._accounts.addresses.length) {
      throw new Error('Index must be a natural number between 0 and ' + (this._accounts.addresses.length - 1));
    }

    this._index = i;
  }

  _setAccounts(accounts) {
    if (typeof accounts !== 'object' || !accounts.addresses || !accounts.keys) {
      throw new Error('Accounts must be an object with properties addresses and keys');
    }

    if (accounts.addresses.length !== accounts.keys.length) {
      throw new Error('Accounts addresses and keys arrays must have the same length');
    }

    this._accounts = accounts;
  }

  _next() {
    if (this._index >= this._accounts.addresses.length) {
      throw new Error('No more test accounts available.');
    }

    const i = this._index++;
    //process.env._TestProviderIndex = i;

    return {
      address: this._accounts.addresses[i],
      key: '0x' + this._accounts.keys[i]
    };
  }
}

const i = 1; //process.env._TestProviderIndex || 1;
const p = new TestAccountProvider(accounts, i);
export {p as default, TestAccountProvider};