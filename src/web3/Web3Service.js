import PrivateService from '../services/PrivateService';
import Web3 from 'web3';

export default class Web3Service extends PrivateService {

  /**
   * @param {string} name
   */
  constructor(name = 'web3') {
    super(name);
    this._web3 = null;
    this._info = { version: { api: null, node: null, network: null, ethereum: null } };
  }

  /**
   * @returns {{api, node, network, ethereum}}
   */
  version() {
    return this._info.version;
  }

  initialize() {
    const web3 = new Web3();

    if (window.web3) {
      web3.setProvider(window.web3.currentProvider);
      window.web3 = web3;
    } else {
      web3.setProvider(new Web3.providers.HttpProvider('https://sai-service.makerdao.com/node'));
    }

    this._web3 = web3;
  }

  connect() {
    return Promise.all([
      _web3Promise(_ => this._web3.version.getNode(_), null),
      _web3Promise(_ => this._web3.version.getNetwork(_), null),
      _web3Promise(_ => this._web3.version.getEthereum(_), null),
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
        // eslint-disable-next-line
        console.error(reason);
      }
    ).then(() => {
      // eslint-disable-next-line
      console.log('Web3 version: ', this._info.version);
    });
  }

  authenticate() {
    // eslint-disable-next-line
    console.log('Web3 is authenticating...');
  }
}

/* istanbul ignore next */
function _web3Promise(cb, onErrorValue) {
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