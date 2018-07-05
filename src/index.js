import 'babel-polyfill';

import { default as Maker } from './Maker';
module.exports = Maker;

import { currencies } from './eth/CurrencyUnits';
for (let symbol in currencies) {
  Maker[symbol] = currencies[symbol];
}
