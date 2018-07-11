import { default as Maker } from './Maker';
module.exports = Maker;

import { currencies } from './eth/Currency';
for (let symbol in currencies) {
  Maker[symbol] = currencies[symbol];
}

import LocalService from './core/LocalService';
import PrivateService from './core/PrivateService';
import PublicService from './core/PublicService';

Maker.service = { LocalService, PrivateService, PublicService };
