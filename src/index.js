import Maker from './Maker';
import { currencies } from './eth/Currency';
import LocalService from './core/LocalService';
import PrivateService from './core/PrivateService';
import PublicService from './core/PublicService';

for (let symbol in currencies) {
  Maker[symbol] = currencies[symbol];
}

Maker.LocalService = LocalService;
Maker.PrivateService = PrivateService;
Maker.PublicService = PublicService;

module.exports = Maker;
