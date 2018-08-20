import PublicService from '../core/PublicService';
import ethUtil from 'ethereumjs-util';
import Wallet from 'web3-provider-engine/dist/es5/subproviders/wallet';

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
    if (this._accountFactories[type]) {
      throw new Error(`Overwriting account type "${type}" is not permitted`);
    }
    this._accountFactories[type] = factory;
  }

  async addAccount(name, { type, ...otherSettings }) {
    const factory = this._accountFactories[type];
    const account = { type, ...(await factory(otherSettings)) };
    this._accounts[name] = account;
    if (!this._currentAccount || name === 'default') {
      this._currentAccount = account;
    }
    return account;
  }

  // eslint-disable-next-line
  useAccount(name) {
    // TODO allow hot-swapping subproviders
  }

  hasAccount() {
    return !!this._currentAccount;
  }

  currentAddress() {
    if (!this.hasAccount()) throw new Error('No account is set up.');
    return this._currentAccount.address;
  }

  getWallet() {
    return this._currentAccount.subprovider;
  }
}
