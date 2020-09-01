/// <reference path="multicall.d.ts" />

// TODO: move plugin type declaration to @makerdao/dai

type AfterCreateCallback = () => void;

type DaiPlugin = {
  addConfig?: () => void;
  beforeCreate?: () => void;
  afterCreate?: AfterCreateCallback; 
} | AfterCreateCallback;

// TODO: move currency type declaration to @makerdao/currency

export const DAI: Currency;
export const DSR_DAI: Currency;
export const ETH: Currency;
export const MKR: Currency;
export const USD: Currency;
export const WETH: Currency;

export const BAT: Currency;
export const DGD: Currency;
export const GNT: Currency;
export const KNC: Currency;
export const MANA: Currency;
export const OMG: Currency;
export const REP: Currency;
export const TUSD: Currency;
export const USDC: Currency;
export const WBTC: Currency;
export const ZRX: Currency;

type CdpTypeInfo = {
  currency: Currency;
  ilk: string;
  decimals?: number;
};

export const defaultCdpTypes: CdpTypeInfo[];

declare const mcdPlugin: DaiPlugin;
export default mcdPlugin;