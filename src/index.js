import Maker from './Maker';
import {
  Currency,
  CurrencyRatio,
  currencies,
  createCurrency,
  createCurrencyRatio,
  getCurrency
} from './eth/Currency';
import { LocalService } from '@makerdao/services-core';
import { PrivateService } from '@makerdao/services-core';
import { PublicService } from '@makerdao/services-core';
import { stringToBytes32 } from './utils/conversion';

for (let symbol in currencies) {
  Maker[symbol] = currencies[symbol];
}

Maker.LocalService = LocalService;
Maker.PrivateService = PrivateService;
Maker.PublicService = PublicService;

Maker.Currency = Currency;
Maker.CurrencyRatio = CurrencyRatio;
Maker.createCurrency = createCurrency;
Maker.createCurrencyRatio = createCurrencyRatio;
Maker.getCurrency = getCurrency;
Maker.currencies = currencies;

Maker.utils = {
  stringToBytes32
};

module.exports = Maker;
