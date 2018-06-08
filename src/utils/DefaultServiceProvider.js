import uniq from 'lodash.uniq';
import Container from '../core/Container';
import Web3Service from '../eth/Web3Service';
import EthereumCdpService from '../eth/EthereumCdpService';
//import EthereumWalletService from './wallets/EthereumWalletService';
import EthereumTokenService from '../eth/EthereumTokenService';
import SmartContractService from '../eth/SmartContractService';
import GasEstimatorService from '../eth/GasEstimatorService';
import OasisExchangeService from '../exchanges/oasis/OasisExchangeService';
import ZeroExExchangeService from '../exchanges/zeroEx/ZeroExExchangeService';
import TimerService from './TimerService';
import TokenConversionService from '../eth/TokenConversionService';
import ConsoleLogger from './loggers/ConsoleLogger';
import NullLogger from './loggers/NullLogger';
import TransactionManager from '../eth/TransactionManager';
import AllowanceService from '../eth/AllowanceService';
import PriceFeedService from '../eth/PriceFeedService';

// maps all possible services to string names, so that configs can refer to them
// by name.
//
// in the future this should be more modular, e.g. rather than having this pull
// in all services (and thus include them in a front-end build), a library user
// could pull in just the ones they want to use, keeping build size down.
const _services = {
  AllowanceService,
  ConsoleLogger,
  EthereumCdpService,
  EthereumTokenService,
  GasEstimatorService,
  NullLogger,
  OasisExchangeService,
  PriceFeedService,
  SmartContractService,
  TimerService,
  TokenConversionService,
  TransactionManager,
  Web3Service,
  ZeroExExchangeService
};

const _defaultServices = {
  allowance: 'AllowanceService',
  cdp: 'EthereumCdpService',
  conversionService: 'TokenConversionService',
  // exchange: intentionally omitted
  gasEstimator: 'GasEstimatorService',
  log: 'ConsoleLogger',
  priceFeed: 'PriceFeedService',
  smartContract: 'SmartContractService',
  timer: 'TimerService',
  token: 'EthereumTokenService',
  transactionManager: 'TransactionManager',
  web3: 'Web3Service'
};

function _disabledService(role) {
  switch (role) {
    case 'log':
      return 'NullLogger';
  }

  throw new Error(`It's not possible to disable the "${role}" service.`);
}

function processConfig(role, config) {
  let className, settings;
  switch (typeof config) {
    case 'string':
      // handle a string that refers to a class name
      className = config;
      settings = {};
      break;
    case 'object':
      if (config instanceof Array) {
        // handle a [class name, settings object] pair
        className = config[0];
        settings = config[1];
      } else {
        // handle a settings object -- use the default version
        className = _defaultServices[role];
        settings = config;
      }
      // TODO could also handle a service instance here
      break;
    case 'boolean':
      // handle a boolean, either disabling the service or indicating that its
      // default version should be used
      if (config) {
        className = _defaultServices[role];
      } else {
        className = _disabledService(role);
      }
      settings = {};
      break;
    default:
      throw new Error(`could not parse settings for ${role}:`, config);
  }

  return [className, settings];
}

export default class DefaultServiceProvider {
  constructor(servicesConfig) {
    this._config = servicesConfig;
  }

  /**
   * @param {string} serviceName
   * @returns {boolean}
   */
  supports(serviceName) {
    return !!_services[serviceName];
  }

  /**
   * @param {object} servicesConfig
   * @returns {Container}
   */
  buildContainer() {
    const container = new Container();

    for (let role in this._config) {
      const [className, settings] = processConfig(role, this._config[role]);

      if (!this.supports(className)) {
        throw new Error('Unsupported service in configuration: ' + className);
      }

      const service = new _services[className]();
      service.manager().settings(settings);
      container.register(service, role);
    }

    this._registerDependencies(container);
    container.injectDependencies();
    this._container = container;
    return container;
  }

  _registerDependencies(container) {
    const names = container.getRegisteredServiceNames();

    // get the names of all dependencies
    const allDeps = names.reduce((acc, name) => {
      const service = container.service(name);
      const deps = service.manager().dependencies();
      return uniq(acc.concat(deps));
    }, []);

    // filter out the ones that are already registered
    const newDeps = allDeps.filter(name => !names.includes(name));
    if (newDeps.length === 0) return;

    // register any remaining ones
    for (let name of newDeps) {
      const className = _defaultServices[name];
      const ctor = _services[className];
      if (!ctor) throw new Error(`No service found for "${name}"`);
      container.register(new ctor(), name);
    }

    // repeat, to find any dependencies for services that were just added
    this._registerDependencies(container);
  }

  service(name) {
    if (!this._container) this.buildContainer();
    return this._container.service(name);
  }
}
