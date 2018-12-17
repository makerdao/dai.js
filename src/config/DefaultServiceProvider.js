import AccountsService from '../eth/AccountsService';
import AllowanceService from '../eth/AllowanceService';
import CacheService from '../utils/CacheService';
import ConsoleLogger from '../utils/loggers/ConsoleLogger';
import DSProxyService from '../eth/DSProxyService';
import EthereumCdpService from '../eth/EthereumCdpService';
import EthereumTokenService from '../eth/EthereumTokenService';
import EventService from '../utils/events/EventService';
import GasEstimatorService from '../eth/GasEstimatorService';
import NonceService from '../eth/NonceService';
import NullEventService from '../utils/events/NullEventService';
import NullLogger from '../utils/loggers/NullLogger';
import OasisDirectService from '../exchanges/oasis/OasisDirectService';
import OasisExchangeService from '../exchanges/oasis/OasisExchangeService';
import PriceService from '../eth/PriceService';
import ServiceProvider from './ServiceProvider';
import SmartContractService from '../eth/SmartContractService';
import TimerService from '../utils/TimerService';
import TokenConversionService from '../eth/TokenConversionService';
import TransactionManager from '../eth/TransactionManager';
import Web3Service from '../eth/Web3Service';
import { getSettings } from './index';

export const resolver = {
  defaults: {
    accounts: 'AccountsService',
    allowance: 'AllowanceService',
    cache: 'CacheService',
    cdp: 'EthereumCdpService',
    conversion: 'TokenConversionService',
    event: 'EventService',
    // exchange: intentionally omitted,
    gasEstimator: 'GasEstimatorService',
    log: 'ConsoleLogger',
    nonce: 'NonceService',
    price: 'PriceService',
    proxy: 'DSProxyService',
    smartContract: 'SmartContractService',
    timer: 'TimerService',
    token: 'EthereumTokenService',
    transactionManager: 'TransactionManager',
    web3: 'Web3Service'
  },
  disabled: {
    event: 'NullEventService',
    log: 'NullLogger'
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
        ConsoleLogger,
        DSProxyService,
        EthereumCdpService,
        EthereumTokenService,
        EventService,
        GasEstimatorService,
        NonceService,
        NullEventService,
        NullLogger,
        OasisDirectService,
        OasisExchangeService,
        PriceService,
        SmartContractService,
        TimerService,
        TokenConversionService,
        TransactionManager,
        Web3Service
      },
      ...resolver
    });
  }
}
