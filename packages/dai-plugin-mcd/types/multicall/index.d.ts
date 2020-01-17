interface Currency {}
interface BigNumber {}

interface WatchInterface {

  /** Watch the total encumbered debt of a collateral type
   * @param ilkName String uniquely identifying an ilk
   */
  totalEncumberedDebt(
      ilkName: string
  ): Currency;

  /**
   * @param ilkName String uniquely identifying an ilk
   */
  debtScalingFactor(
      ilkName: string
  ): BigNumber;

  /**
   * @param ilkName String uniquely identifying an ilk
   */
  priceWithSafetyMargin(
      ilkName: string
  ): BigNumber;

  /**
   * @param ilkName String uniquely identifying an ilk
   */
  debtCeiling(
      ilkName: string
  ): Currency;

  /**
   * @param ilkName String uniquely identifying an ilk
   */
  urnDebtFloor(
      ilkName: string
  ): BigNumber;

  /** Watch the price of an ilk
   * @param ilkName String uniquely identifying an ilk
   */
  ilkPrice(
      ilkName: string
  ): Currency;

  /** Watch the prices of a list of ilks
   * @param ilkName Array of strings uniquely identifying ilks
   */
  ilkPrices(
      [ilkNames]: string
  ): Currency;

  /**
   * @param ilkName String uniquely identifying an ilk
   * @param urn String hexidecimal address of the vault handler
   */
  unlockedCollateral(
    ilkName: string,
    urn: string
  ): BigNumber;

  /**
   * @param ilkName String uniquely identifying an ilk
   * @param urn String hexidecimal address of the vault handler
   */
  encumberedCollateral(
    ilkName: string,
    urn: string
    ): BigNumber;

  /**
   * @param ilkName String uniquely identifying an ilk
   * @param urn String hexidecimal address of the vault handler
   */
  encumberedDebt(
    ilkName: string,
    urn: string
    ): BigNumber;

  /**
   * @param ilkName String uniquely identifying an ilk
   */
  annualStabilityFee(
    ilkName: string
    ): number;

  /**
   * @param ilkName String uniquely identifying an ilk
   */
  feeUpdateTimestamp(
    ilkName: string
    ): number;

   /**
   * @param ilkName String uniquely identifying an ilk
   */
  liquidatorAddress(
    ilkName: string
    ): string;

  /**
   * @param ilkName String uniquely identifying an ilk
   */
  liquidationPenalty(
    ilkName: string
    ): number;

  /**
   * @param ilkName String uniquely identifying an ilk
   */
  maxAuctionLotSize(
    ilkName: string
    ): BigNumber;


}

declare var watch: WatchInterface;

declare module 'watch' {
    export = watch;
}
