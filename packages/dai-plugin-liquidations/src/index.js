import LiquidationService from './LiquidationService';

export default {
  addConfig: function(config) {
    return {
      ...config,
      additionalServices: ['liquidation'],
      liquidation: LiquidationService
    };
  }
};
