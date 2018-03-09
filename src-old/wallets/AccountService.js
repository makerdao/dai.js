import PrivateService from '../services/PrivateService';
import NullLogger from '../loggers/NullLogger/NullLogger';
import TimerService from '../TimerService';
var Wallet = require('ethers').Wallet;

export default class AccountService extends PrivateService {
  constructor(name='account', wallet=null) {
    super(name, ['log', 'timer']);
    // all wallets here are the ethers.Wallet object, and so have signing capabilities attached to them
    this._activeWallet = wallet;
    this._accountWallets = new Array(wallet);
    this._defaultWallet = null;
    this._lockedWallet = null;
    // TODO: Can load wallets from browser memory(?) or start fresh each time.  Loading from browser memory could be a security risk 
  }


  getDefaultWallet() {
    const defaultWallet = this._defaultWallet;
    return defaultWallet;
  }

  setDefaultWallet(wallet) {
    this._defaultWallet = wallet;
  }

  setActiveWallet(wallet) {
    this.activeWallet = wallet;
  }

  getWalletFromPrivateKey(key) {
    var wallet = new Wallet(key);
    this._addWalletToAccount(wallet);
    return wallet;
  }

  getWalletFromJson(data, password) {
    var json = JSON.stringify(data);
    Wallet.fromEncryptedWallet(json, password).then(function(wallet) {
      this._addWalletToAccount(wallet);
      return wallet;
    });
  }

  _wrapWallet(etherswallet){
    // need to make an Account object, this is wrong
    return new AccountService(wallet=etherswallet);
  }

  _addWalletToAccount(wallet) {
    this._accountWallets.push(wallet);
  }

  lockAccount(){
    if (this._lockedWallet == null) {
      this._lockedWallet = this._activeWallet;
      this._activeWallet = null;
    } else {
      console.log(error, 'account is already locked');
    }
  }

  unlockAccount(){
    if (this._lockedWallet != null) {
      this._activeWallet = this._lockedWallet;
      this.lockedWallet = null;
    } else {
      console.log(error, 'account is already unlocked');
    }
  }


  /// Test Constructors

  static buildTestService() {
    const service = new AccountService();
    service.manager()
      .inject('log', new NullLogger())
      .inject('timer', new TimerService());

    return service;
  }

}