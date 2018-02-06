import PrivateService from '../services/PrivateService';
import Web3 from 'web3';
import { promisifyAsyncMethods } from '../Utils';
var ganache = require('ganache-cli');

export default class Web3Service extends PrivateService {

  /**
   * @param {string} name
   */
  constructor(provider = null, name = 'web3') {
    super(name, ['log']);
    this._web3 = null;
    this._info = { version: { api: null, node: null, network: null, ethereum: null } , account: null };
    this._provider = provider;
  }

  /**
   * @returns {{api, node, network, ethereum}}
   */
  version() {
    return this._info.version;
  }

  initialize() {
    const web3 = new Web3();
    var $TRAVIS_OS_NAME;

    if (this._provider) {
      web3.setProvider(this._provider);
    } else if (window && window.web3) {
      web3.setProvider(window.web3.currentProvider);
      window.web3 = web3;
    } else if ( $TRAVIS_OS_NAME  == 'linux' ){
      web3.setProvider(ganache.provider());
    } 
    else {
      web3.setProvider(new Web3.providers.HttpProvider('https://sai-service.makerdao.com/node'));
    }

    this.eth = {};
    Object.assign(this.eth, promisifyAsyncMethods(
      web3.eth, [ 'getAccounts' ]
    ));

    this.personal = {};
    Object.assign(this.personal, promisifyAsyncMethods(
      web3.personal,
      [ 'lockAccount', 'newAccount', 'unlockAccount' ]
    ));
    this._web3 = web3;
  }

  connect() {
    return Promise.all([
      _web3Promise(_ => this._web3.version.getNode(_)),
      _web3Promise(_ => this._web3.version.getNetwork(_)),
      _web3Promise(_ => this._web3.version.getEthereum(_)),
      _web3Promise(_ => this._web3.version.getWhisper(_), null)

    ]).then(
      versions => this._info.version = {
        api: this._web3.version.api,
        node: versions[0],
        network: versions[1],
        ethereum: versions[2],
        whisper: versions[3],
      },
      reason => {
        this.get('log').error(reason);
      }

    ).then(() => {
      this.get('log').info('Web3 version: ', this._info.version);
    });
  }

  authenticate() {
    this.get('log').info('Web3 is authenticating...');

    return _web3Promise(_ => this._web3.eth.getAccounts(_))
      .then(data => {
        if (!(data instanceof Array) || (data.length < 1) ) {
          throw new Error ('Web3 is not authenticated');
        }
        this._info.account = data[0];
      },
      reason => {
        this.get('log').error(reason);
      });
  }
}

/* istanbul ignore next */
export function _web3Promise(cb, onErrorValue) {
  return new Promise((resolve, reject) => {
    try {
      cb((error, result) => {
        if (error) {
          if (typeof onErrorValue === 'undefined') {
            reject(error);
          } else {
            resolve(onErrorValue);
          }
        } else {
          resolve(result);
        }
      });
    } catch(e) {
      if (typeof onErrorValue === 'undefined') {
        reject(e);
      } else {
        resolve(onErrorValue);
      }
    }
  });
}
