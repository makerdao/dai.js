import accounts from './testAccounts';

/**
 *
 */
class TestAccountProvider {

  constructor(accounts) {
    this._accounts = accounts;
    console.log('TestProvider constructor');
    this._index = 0; //process.env._TestProviderIndex || 0;
  }

  nextAddress() {
    return this._next().address;
  }

  nextAccount() {
    return this._next();
  }

  _next() {
    if (this._index >= this._accounts.addresses.length) {
      throw new Error('No more test accounts available.');
    }

    const i = this._index++;
    process.env._TestProviderIndex = i;

    return {
      address: this._accounts.addresses[i],
      key: this._accounts.keys[i]
    };
  }
}

const p = new TestAccountProvider(accounts);
export default p;