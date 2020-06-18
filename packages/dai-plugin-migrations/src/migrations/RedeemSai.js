import { DAI } from '..';

export default class RedeemSai {
  constructor(manager) {
    this._manager = manager;
    this._tap = this._manager.get('smartContract').getContract('SAI_TAP');
    return this;
  }

  off() {
    return this._tap.off();
  }

  async getRate() {
    const fix = await this._tap.fix();
    return fix / Math.pow(10, 27);
  }

  redeemSai(wad) {
    const cageFree = this._manager
      .get('smartContract')
      .getContract('SAI_CAGEFREE');
    return cageFree.freeCash(DAI(wad).toFixed(18));
  }
}
