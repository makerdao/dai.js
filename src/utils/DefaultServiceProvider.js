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
import PriceService from '../eth/PriceService';
import CacheService from '../utils/CacheService';
import { defaultServices, standardizeConfig } from './config';

// maps all possible services to string names, so that configs can refer to them
// by name.
//
// in the future this should be more modular, e.g. rather than having this pull
// in all services (and thus include them in a front-end build), a library user
// could pull in just the ones they want to use, keeping build size down.
const _services = {
  AllowanceService,
  CacheService,
  ConsoleLogger,
  EthereumCdpService,
  EthereumTokenService,
  GasEstimatorService,
  NullLogger,
  OasisExchangeService,
  PriceService,
  SmartContractService,
  TimerService,
  TokenConversionService,
  TransactionManager,
  Web3Service,
  ZeroExExchangeService
};

export default class DefaultServiceProvider {
  constructor(config) {
    this._config = config;
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
      const [className, settings] = standardizeConfig(role, this._config[role]);

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
      const className = defaultServices[name];
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
