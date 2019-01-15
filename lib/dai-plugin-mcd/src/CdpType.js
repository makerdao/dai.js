

export default class CdpType {
  constructor(collateralService, currency) {
    this._collateralService = collateralService;
    this.currency = currency;
  }
}

// each of these methods just calls the method of the same name on the service
// with the cdp's id as the first argument
const passthroughMethods = [
  'getTotalCollateral',
  'getTotalDebt',
  'getDebtCeiling',
  'getLiquidationRatio',
  'getPrice',
  'getLiquidationPenalty',
  'getAnnualStabilityFee',
  'getMaxBidLifetime',
  'getMaxAuctionDuration',
  'getMinBidIncrease'
];

Object.assign(
  CdpType.prototype,
  passthroughMethods.reduce((acc, name) => {
    acc[name] = function(...args) {
      return this._collateralService[name](this.currency, ...args);
    };
    return acc;
  }, {})
);