import Container from './services/Container';
import Web3Service from './web3/Web3Service';
import EthereumCdpService from './services/EthereumCdpService';
import EthereumWalletService from './wallets/EthereumWalletService';
import EthereumTokenService from './services/EthereumTokenService';
import SmartContractService from './services/SmartContractService';
import GasEstimatorService from './services/GasEstimatorService';
import OasisExchangeService from './markets/OasisExchangeService';
import TimerService from './TimerService';
import NullLoggerService from './loggers/NullLogger/NullLoggerService';

const _services = {
  Web3Service,
  EthereumCdpService,
  EthereumWalletService,
  EthereumTokenService,
  SmartContractService,
  GasEstimatorService,
  OasisExchangeService,
  TimerService,
  NullLoggerService
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
    const result = this.supports(serviceName) ? new _services[serviceName]() : null;

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
      const serviceItem = servicesConfig[role] instanceof Array ?
        servicesConfig[role] : [servicesConfig[role], {}];

      if (this.supports(serviceItem[0])) {
        container.register(this.create(serviceItem[0], serviceItem[1]), role);
      } else {
        throw new Error('Unsupported service in configuration: ' + serviceItem[0]);
      }
    });

    return container;
  }
}