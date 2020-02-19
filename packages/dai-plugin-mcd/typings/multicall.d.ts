declare global {
  interface Currency {}
  interface CurrencyRatio {}
  interface VaultResult {
     /**
     * The id of this vault.
     */
    id: number;

     /**
     * The collateral type of this vault.
     */
    vaultType: string;

    /**
     * The address of this vault.
     */
    vaultAddress: string;

    /**
     * The address of the proxy that owns this vault.
     */
    ownerAddress: string;

    /**
     * The address of the owner of the proxy, or ownerAddress.
     */
    externalOwnerAddress: string;

    /**
     * The amount of collateral locked for this vault.
     */
    encumberedCollateral: Currency;

    /**
     * The amount of stablecoin debt owed for this vault.
     */
    encumberedDebt: Currency;

    /**
     * The price of this vault's collateral type.
     */
    collateralTypePrice: CurrencyRatio;

    /**
     * The value in DAI of this vault's debt.
     */
    debtValue: Currency;

    /**
     * The ratio of collateral price to stablecoin debt.
     */
    collateralizationRatio: CurrencyRatio;

    /**
     * The amount of this vault's locked collateral.
     */
    collateralAmount: Currency;

    /**
     * The value in USD of this vault's locked collateral.
     */
    collateralValue: Currency;

    /**
     * The minimum price of the collateral possible to remain above the liquidation ratio.
     */
    liquidationPrice: CurrencyRatio;

    /**
     * The maximum amount DAI available to generate for this vault.
     */
    daiAvailable: Currency;

    /**
     * The amount of collateral available to withdraw.
     */
    collateralAvailableAmount: Currency;

    /**
     * The value in USD of the collateral available to withdraw.
     */
    collateralAvailableValue: Currency;

    /**
     * The amount of collateral that has been joined, but not yet locked.
     */
    unlockedCollateral: Currency;

    /**
     * The minimum ratio of collateral price to debt allowed.
     */
    liquidationRatio: CurrencyRatio;

    /**
     * The penalty incurred for liquidation of this vault.
     */
    liquidationPenalty: BigNumber;

    /**
     * The stability fee for this vault.
     */
    annualStabilityFee: number;

    /**
     * The minimum amount of stablecoin debt can exist this vault.
     */
    debtFloor: BigNumber;
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

    /** Watch the prices of ilks defined in the system
     *
     * Default ilks defined in the dai.js mcd-plugin
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
     * @param id Numerical id of the vault
     */
    static debtValue(id: number): Currency;

    /**
     * @param id Numerical id of the vault
     */
    static collateralValue(id: number): Currency;

    /**
     * @param id Numerical id of the vault
     */
    static daiAvailable(id: number): Currency;

    /**
     * Get a vault by id.
     * @param id Numerical id of the vault
     */
    static vault(id: number): VaultResult;

    /**
     * @param id Numerical id of the vault
     */
    static minSafeCollateralAmount(id: number): Currency;
    /**
     * @param id Numerical id of the vault
     */
    static collateralAvailableAmount(id: number): Currency;
    /**
     * @param id Numerical id of the vault
     */
    static collateralAvailableValue(id: number): Currency;
  }
}

export default WatchInterfaceMcd;
