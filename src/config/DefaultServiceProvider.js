import Web3Service from '../eth/Web3Service';
import EthereumCdpService from '../eth/EthereumCdpService';
import EthereumTokenService from '../eth/EthereumTokenService';
import SmartContractService from '../eth/SmartContractService';
import GasEstimatorService from '../eth/GasEstimatorService';
import OasisExchangeService from '../exchanges/oasis/OasisExchangeService';
import TimerService from '../utils/TimerService';
import TokenConversionService from '../eth/TokenConversionService';
import ConsoleLogger from '../utils/loggers/ConsoleLogger';
import NullLogger from '../utils/loggers/NullLogger';
import TransactionManager from '../eth/TransactionManager';
import AllowanceService from '../eth/AllowanceService';
import PriceService from '../eth/PriceService';
import EventService from '../utils/events/EventService';
import NullEventService from '../utils/events/NullEventService';
import CacheService from '../utils/CacheService';
import ServiceProvider from './ServiceProvider';

export const resolver = {
  defaults: {
    allowance: 'AllowanceService',
    cache: 'CacheService',
    cdp: 'EthereumCdpService',
    conversion: 'TokenConversionService',
    event: 'EventService',
    // exchange: intentionally omitted
    gasEstimator: 'GasEstimatorService',
    log: 'ConsoleLogger',
    price: 'PriceService',
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
  constructor(config) {
    super(config, {
      services: {
        AllowanceService,
        CacheService,
        ConsoleLogger,
        EthereumCdpService,
        EthereumTokenService,
        EventService,
        GasEstimatorService,
        NullEventService,
        NullLogger,
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
