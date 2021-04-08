import LiquidationService from './LiquidationService';

export const MCD_CLIP_LINK_A = 'MCD_CLIP_LINK_A';

export default {
  addConfig: function(config) {
    return {
      ...config,
      additionalServices: ['liquidation'],
      liquidation: LiquidationService
    };
  }
};
