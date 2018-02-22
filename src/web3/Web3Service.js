import PrivateService from '../services/PrivateService';
import Web3 from 'web3';
import { promisifyAsyncMethods } from '../Utils';
import { Web3ProviderType } from '../enums';
import NullLoggerService from '../loggers/NullLogger/NullLoggerService';
import TimerService from '../TimerService';
//{ type : Web3ProviderType.TEST}; 
//const x = { type : Web3ProviderType.HTTP, url : 'https://sai-service.makerdao.com/node'};
//const y = { type : Web3ProviderType.HTTP, url : 'https://sai-service.makerdao.com/node', usePredefined : false};
//const z = { type : Web3ProviderType.HTTP, url : ['https://sai-service.makerdao.com/node', 'https://mainnet.infura.io/ihagQOzC3mkRXYuCivDN']}

export default class Web3Service extends PrivateService {

  /**
   * @param {string} name
   */
  constructor(provider = null, name = 'web3') {
    super(name, ['log', 'timer']);
    this._web3 = null;
    this._info = { version: { api: null, node: null, network: null, ethereum: null } , account: null };
    this._provider = provider;
  }

  static buildDisconnectingService(disconnectAfter = 50){
    const service = Web3Service.buildTestService();
    service.manager().onConnected(()=> {
      service.get('timer').createTimer('disconnect', disconnectAfter, false, () => {
        service._web3.version.getNode =
        () => {
          throw new Error('disconnected');
        };
      });
    });
    return service;
  }

  static buildNetworkChangingService(changeNetworkAfter = 50){
    const service = Web3Service.buildTestService();
    service.manager().onConnected(()=> {
      service.get('timer').createTimer('changeNetwork', changeNetworkAfter, false, ()=> {
        service._web3.version.getNetwork = (cb) => cb(undefined, 999); //fake network id
      });
    });
    return service;
  }

  static buildDeauthenticatingService(deauthenticateAfter = 50){
    const service = Web3Service.buildTestService();

    service.manager().onAuthenticated(() => {
      service.get('timer').createTimer('deauthenticate', deauthenticateAfter, false, () => {
        service._web3.eth.getAccounts = (cb) => cb(undefined, []);
      });
    });
    return service;
  }

  static buildAccountChangingService(changeAccountAfter = 50){
    const service = Web3Service.buildTestService();
    service.manager().onAuthenticated(()=> {
      service.get('timer').createTimer('changeAccount', changeAccountAfter, false, ()=> {
        service._web3.eth.getAccounts = (cb) => cb(undefined, ['0x123456789']); //fake account
      });
    });
    return service;
  }

  static buildTestService(mnemonic , totalAccounts) {
    const service = new Web3Service();
    service.manager()
      .inject('log', new NullLoggerService())
      .inject('timer', new TimerService())
      .settings(
        {
          provider : {
            type : Web3ProviderType.TEST,
            mnemonic : mnemonic || 'hill law jazz limb penalty escape public dish stand bracket blue jar',
            totalAccounts : totalAccounts || 2
          }
        }
      );

    return service;
  }

  static buildRemoteService() {
    const service = new Web3Service();
    service.manager().inject('log', new NullLoggerService())
      .inject('timer', new TimerService());
    return service;
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
      var ganache = require('ganache-cli');
      web3.setProvider(ganache.provider({
        'mnemonic': settings.provider.mnemonic || undefined,
        'total_accounts': settings.provider.totalAccounts || 0
      }));

    } else if ( settings.provider.type === Web3ProviderType.HTTP ) {
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
      versions => {

        this._info.version = {
          api: this._web3.version.api,
          node: versions[0],
          network: versions[1],
          ethereum: versions[2],
          whisper: versions[3],
        };

        this.get('timer').createTimer(
          'web3CheckConnectionStatus', 500, true,
          () => this._isStillConnected().then(connected => {
            if (!connected) {
              this.disconnect();
            }
          })
        );

      },

      reason => {
        this.get('log').error(reason);
      }

    ).then(
      () => this.get('log').info('Web3 version: ', this._info.version),
      reason => this.get('log').error(reason)
    );
  }

  _isStillConnected() {
    return Promise.all([
      _web3Promise(_ => this._web3.version.getNode(_)),
      _web3Promise(_ => this._web3.version.getNetwork(_))
    ]).then(
      versionInfo => (versionInfo[1] === this._info.version['network']),
      () => false
    );
  }

  authenticate() {
    this.get('log').info('Web3 is authenticating...');

    return _web3Promise(_ => this._web3.eth.getAccounts(_)) // why is there a _ here?
      .then(data => {
        if (!(data instanceof Array) || (data.length < 1) ) {
          throw new Error ('Web3 is not authenticated');
        }
        this._info.account = data[0];
        this.get('timer').createTimer(
          'web3CheckAuthenticationStatus',
          300, //what should this number be?
          true,
          ()=> this._isStillAuthenticated()
            .then(
              (authenticated)=> {
                if (!authenticated) { 
                  this.deauthenticate();}
              }
            )
        );
      },
      reason => {
        this.get('log').error(reason);
      });
  }

  _isStillAuthenticated() {
    return _web3Promise(_ => this._web3.eth.getAccounts(_)).then(
      accounts => (accounts[0] === this._info.account),
      () => false
    );
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
