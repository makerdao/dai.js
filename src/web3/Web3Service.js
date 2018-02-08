import PrivateService from '../services/PrivateService';
import Web3 from 'web3';
import { promisifyAsyncMethods } from '../Utils';
var ganache = require('ganache-cli');
import { Web3ProviderType } from '../enums';
import NullLoggerService from '../loggers/NullLogger/NullLoggerService';
//{ type : Web3ProviderType.TEST}; 
//const x = { type : Web3ProviderType.HTTP, url : 'https://sai-service.makerdao.com/node'};
//const y = { type : Web3ProviderType.HTTP, url : 'https://sai-service.makerdao.com/node', usePredefined : false};
//const z = { type : Web3ProviderType.HTTP, url : ['https://sai-service.makerdao.com/node', 'https://mainnet.infura.io/ihagQOzC3mkRXYuCivDN']}

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

  static buildTestService(mnemonic , totalAccounts) {

    const result = new Web3Service();
    result.manager().inject('log', new NullLoggerService())
      .settings({ provider : { 
        type : Web3ProviderType.TEST,
        mnemonic : mnemonic || 'hill law jazz limb penalty escape public dish stand bracket blue jar',
        totalAccounts : totalAccounts || 2
      }
      });
    return result;
  }

  /**
   * @returns {{api, node, network, ethereum}}
   */
  version() {
    return this._info.version;
  }

  initialize(settings) {
    settings = settings || { provider : {type : Web3ProviderType.HTTP, url : 'https://sai-service.makerdao.com/node'}};
    const web3 = new Web3();
    if (this._provider) {
      web3.setProvider(this._provider);
    } else if (window && window.web3) {
      web3.setProvider(window.web3.currentProvider);
      window.web3 = web3;
    } else if ( settings.provider.type  === Web3ProviderType.TEST ){
      web3.setProvider(ganache.provider({
        'mnemonic': settings.provider.mnemonic || undefined,
        'total_accounts': settings.provider.totalAccounts || 0
      }));
    } 
    else if ( settings.provider.type === Web3ProviderType.HTTP ) {
      web3.setProvider(new Web3.providers.HttpProvider(settings.provider.url));
    } else {
      this.get('log').error('Illegal Provider Config', settings);
      throw new Error('Illegal Provider Config');
    }

    this.eth = {};
    Object.assign(this.eth, promisifyAsyncMethods(
      web3.eth, [ 'getAccounts', 'estimateGas', 'getBlock']
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

  //using same dummy data as in the web3 documentation: https://github.com/ethereum/wiki/wiki/JavaScript-API#web3ethestimategas
  getDummyTransaction(){
    return {
      to: '0xc4abd0339eb8d57087278718986382264244252f', 
      data: '0xc6888fa10000000000000000000000000000000000000000000000000000000000000003'
    };
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
