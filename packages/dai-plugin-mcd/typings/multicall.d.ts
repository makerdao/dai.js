declare global {
  interface Currency {}
  interface CurrencyRatio {}
  interface VaultResult {
    /**
     * The address of this vault.
     *
     * Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
     * tempor incididunt ut labore et dolore magna aliqua.
     *
     * ```ts
     * console.log('test code');
     * ```
     */
    vaultAddress: string;

    /**
     * The price of this vault's collateral type.
     *
     * Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
     * tempor incididunt ut labore et dolore magna aliqua.
     *
     */
    collateralTypePrice: CurrencyRatio;

    /**
     * Lorem ipsum.
     *
     * Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
     * tempor incididunt ut labore et dolore magna aliqua.
     *
     */
    encumberedCollateral: Currency;

    /**
     * Lorem ipsum.
     *
     * Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
     * tempor incididunt ut labore et dolore magna aliqua.
     *
     */
    encumberedDebt: Currency;
  }

  interface WatchInterfaceMcd {
    /** Watch the total encumbered debt of a collateral type
     * @param collateralTypeName String uniquely identifying a collateral type
     */
    static totalEncumberedDebt(collateralTypeName: string): Currency;

    /**
     * @param collateralTypeName String uniquely identifying a collateral type
     */
    static debtScalingFactor(collateralTypeName: string): BigNumber;

    /**
     * @param collateralTypeName String uniquely identifying a collateral type
     */
    static priceWithSafetyMargin(collateralTypeName: string): BigNumber;

    /** Get the Dai debt ceiling for a particular collateral type
     * @param collateralTypeName String uniquely identifying a collateral type
     */
    static debtCeiling(collateralTypeName: string): Currency;

    /** Minimum amount of debt that can be generated when opening a vault of that type
     * @param collateralTypeName String uniquely identifying a collateral type
     */
    static debtFloor(collateralTypeName: string): BigNumber;

    /** Watch the price of a collateral type
     * @param collateralTypeName String uniquely identifying a collateral type
     */
    static collateralTypePrice(collateralTypeName: string): Currency;

    /** Watch the prices of a list of ilks
     */
    static collateralTypesPrices(): Currency;

    /**
     * @param collateralTypeName String uniquely identifying a collateral type
     * @param vaultAddress String hexidecimal address of the vault handler
     */
    static unlockedCollateral(
      collateralTypeName: string,
      vaultAddress: string
    ): BigNumber;

    /**
     * @param collateralTypeName String uniquely identifying a collateral type
     * @param vaultAddress String hexidecimal address of the vault handler
     */
    static encumberedCollateral(
      collateralTypeName: string,
      vaultAddress: string
    ): BigNumber;

    /**
     * @param collateralTypeName String uniquely identifying a collateral type
     * @param vaultAddress String hexidecimal address of the vault handler
     */
    static encumberedDebt(
      collateralTypeName: string,
      vaultAddress: string
    ): BigNumber;

    /**
     * @param collateralTypeName String uniquely identifying a collateral type
     */
    static annualStabilityFee(collateralTypeName: string): number;

    /**
     * @param collateralTypeName String uniquely identifying a collateral type
     */
    static feeUpdateTimestamp(collateralTypeName: string): number;

    /**
     * @param collateralTypeName String uniquely identifying a collateral type
     */
    static liquidatorAddress(collateralTypeName: string): string;

    /**
     * @param collateralTypeName String uniquely identifying a collateral type
     */
    static liquidationPenalty(collateralTypeName: string): number;

    /**
     * @param collateralTypeName String uniquely identifying a collateral type
     */
    static maxAuctionLotSize(collateralTypeName: string): BigNumber;

    /**
     * Get a vault by id.
     *
     * Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
     * tempor incididunt ut labore et dolore magna aliqua.
     *
     * ```js
     * const vault = watch.vaultById(2)
     * ```
     *
     * @param id Numerical id of the vault
     */
    static vaultById(id: number): VaultResult;
  }
}

export default WatchInterfaceMcd;
