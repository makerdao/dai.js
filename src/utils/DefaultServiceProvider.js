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

const _services = {
  Web3Service,
  EthereumCdpService,
  //EthereumWalletService,
  EthereumTokenService,
  SmartContractService,
  GasEstimatorService,
  OasisExchangeService,
  ZeroExExchangeService,
  TimerService,
  TokenConversionService,
  ConsoleLogger
};

export default class DefaultServiceProvider {
  /**
   * @param {string} serviceName
   * @returns {boolean}
   */
  supports(serviceName) {
    return !!_services[serviceName];
  }

  /**
   * @param {string} serviceName
   * @param {object} settings
   * @returns {object} | null
   */
  create(serviceName, settings = {}) {
    const result = this.supports(serviceName)
      ? new _services[serviceName]()
      : null;

    if (result !== null) {
      result.manager().settings(settings);
    }

    return result;
  }

  /**
   * @param {object} servicesConfig
   * @returns {Container}
   */
  buildContainer(servicesConfig) {
    const container = new Container();

    Object.keys(servicesConfig).forEach(role => {
      const serviceItem =
        servicesConfig[role] instanceof Array
          ? servicesConfig[role]
          : [servicesConfig[role], {}];

      if (this.supports(serviceItem[0])) {
        container.register(this.create(serviceItem[0], serviceItem[1]), role);
      } else {
        throw new Error(
          'Unsupported service in configuration: ' + serviceItem[0]
        );
      }
    });

    return container;
  }
}
