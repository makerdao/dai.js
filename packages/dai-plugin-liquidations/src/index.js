import LiquidationService from './LiquidationService';

export const MCD_DOG = 'MCD_DOG';

export default {
  addConfig: function(config) {
    return {
      ...config,
      additionalServices: ['liquidation'],
      liquidation: LiquidationService
    };
  }
};
