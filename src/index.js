import { default as Maker } from './Maker';
module.exports = Maker;

import { currencies } from './eth/Currency';
for (let symbol in currencies) {
  Maker[symbol] = currencies[symbol];
}
