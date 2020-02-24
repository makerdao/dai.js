import { ServiceProvider } from '@makerdao/services-core';
import EthereumCdpService from '../EthereumCdpService'
import PriceService from '../PriceService'
import { getSettings } from './index';

export const resolver = {
  defaults: {
    cdp: 'EthereumCdpService',
    price: 'PriceService'
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
        EthereumCdpService,
        PriceService
      },
      ...resolver
    });
  }
}
