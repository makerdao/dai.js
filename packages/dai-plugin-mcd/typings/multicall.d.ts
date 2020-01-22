declare global {
  interface WatchInterfaceMcd {

    /** Watch the total encumbered debt of a collateral type
     * @param ilkName String uniquely identifying an ilk
     */
    static totalEncumberedDebt(
      ilkName: string
    ): Currency;

    /**
     * @param ilkName String uniquely identifying an ilk
     */
    static debtScalingFactor(
      ilkName: string
    ): BigNumber;

    /**
     * @param ilkName String uniquely identifying an ilk
     */
    static priceWithSafetyMargin(
        ilkName: string
    ): BigNumber;

    /** Get the Dai debt ceiling for a particular collateral type
     * @param ilkName String uniquely identifying an ilk
     */
    static debtCeiling(
        ilkName: string
    ): Currency;

    /**
     * @param ilkName String uniquely identifying an ilk
     */
    static urnDebtFloor(
        ilkName: string
    ): BigNumber;

    /** Watch the price of an ilk
     * @param ilkName String uniquely identifying an ilk
     */
    static ilkPrice(
        ilkName: string
    ): Currency;

    /** Watch the prices of a list of ilks
     * @param ilkName Array of strings uniquely identifying ilks
     */
    static ilkPrices(
        [ilkNames]: string
    ): Currency;

    /**
     * @param ilkName String uniquely identifying an ilk
     * @param urn String hexidecimal address of the vault handler
     */
    static unlockedCollateral(
      ilkName: string,
      urn: string
    ): BigNumber;

    /**
     * @param ilkName String uniquely identifying an ilk
     * @param urn String hexidecimal address of the vault handler
     */
    static encumberedCollateral(
      ilkName: string,
      urn: string
      ): BigNumber;

    /**
     * @param ilkName String uniquely identifying an ilk
     * @param urn String hexidecimal address of the vault handler
     */
    static encumberedDebt(
      ilkName: string,
      urn: string
      ): BigNumber;

    /**
     * @param ilkName String uniquely identifying an ilk
     */
    static annualStabilityFee(
      ilkName: string
      ): number;

    /**
     * @param ilkName String uniquely identifying an ilk
     */
    static feeUpdateTimestamp(
      ilkName: string
      ): number;

    /**
     * @param ilkName String uniquely identifying an ilk
     */
    static liquidatorAddress(
      ilkName: string
      ): string;

    /**
     * @param ilkName String uniquely identifying an ilk
     */
    static liquidationPenalty(
      ilkName: string
      ): number;

    /**
     * @param ilkName String uniquely identifying an ilk
     */
    maxAuctionLotSize(
      ilkName: string
      ): BigNumber;
  }
}

export default WatchInterfaceMcd;
