import { ServiceProvider } from '@makerdao/services-core';
import EthereumCdpService from '../EthereumCdpService';
import PriceService from '../PriceService';
import TokenConversionService from '../TokenConversionService';
import { getSettings } from './index';

export const resolver = {
  defaults: {
    cdp: 'EthereumCdpService',
    price: 'PriceService',
    conversion: 'TokenConversionService'
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
        EthereumCdpService,
        PriceService,
        TokenConversionService
      },
      ...resolver
    });
  }
}
