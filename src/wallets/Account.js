import EthereumWalletService from './EthereumWalletService';
var Wallet = require('ethers').Wallet;

export default class Account extends EthereumWalletService {
  constructor(name='account', wallet=null) {
    super(name, ['log', 'web3']);
    // wallets are the ethers.Wallet object, and so have signing capabilities attached to them
    this._wallet = wallet;
    this._defaultWallet = null;
    // want to store an array of wallets (?)
  }

  getDefaultWallet() {
    const defaultWallet = this._defaultWallet;
    return defaultWallet;
  }

  setDefaultWallet(wallet) {
    this._defaultWallet = wallet;
  }

  wrapWallet(etherswallet){
    return new Account(wallet=etherswallet);
  }

  addWalletToAccount(wallet) {
    // best way to store an array? can we use the browser storage for this?
  }

  getAccountFromPrivateKey(key) {
    var wallet = new Wallet(key);
    return this.wrapWallet(wallet);
  }

  getAccountFromJsonWallet(data, password) {
    var json = JSON.stringify(data);
    Wallet.fromEncryptedWallet(json, password).then(function(wallet) {
      // "Address: 0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290"
      return this.wrapWallet(wallet);
  });
  }
}