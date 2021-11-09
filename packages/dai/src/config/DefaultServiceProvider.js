import ServiceProvider from '../../../services-core/src/ServiceProvider';
import AccountsService from '../eth/AccountsService';
import AllowanceService from '../eth/AllowanceService';
import CacheService from '../utils/CacheService';
import DSProxyService from '../eth/DSProxyService';
import EthereumTokenService from '../eth/EthereumTokenService';
import EventService from '../utils/events/EventService';
import GasService from '../eth/GasService';
import MulticallService from '../eth/MulticallService';
import NonceService from '../eth/NonceService';
import NullEventService from '../utils/events/NullEventService';
import SmartContractService from '../eth/SmartContractService';
import TimerService from '../utils/TimerService';
import TransactionManager from '../eth/TransactionManager';
import Web3Service from '../eth/Web3Service';
import { getSettings } from './index';

export const resolver = {
  defaults: {
    accounts: 'AccountsService',
    allowance: 'AllowanceService',
    cache: 'CacheService',
    event: 'EventService',
    gas: 'GasService',
    multicall: 'MulticallService',
    nonce: 'NonceService',
    proxy: 'DSProxyService',
    smartContract: 'SmartContractService',
    timer: 'TimerService',
    token: 'EthereumTokenService',
    transactionManager: 'TransactionManager',
    web3: 'Web3Service'
  },
  disabled: {
    event: 'NullEventService'
  }
};

export default class DefaultServiceProvider extends ServiceProvider {
  constructor(config = {}) {
    if (config.web3) {
      config = {
        ...config,
        accounts: {
          ...config.accounts,
          web3: getSettings(config.web3)
        }
      };
    }

    super(config, {
      services: {
        AccountsService,
        AllowanceService,
        CacheService,
        DSProxyService,
        EthereumTokenService,
        EventService,
        GasService,
        MulticallService,
        NonceService,
        NullEventService,
        SmartContractService,
        TimerService,
        TransactionManager,
        Web3Service
      },
      ...resolver
    });
  }
}
