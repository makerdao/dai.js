import BigNumber from 'bignumber.js';
import { WAD, RAY } from './constants';
import { utils } from 'ethers';
const EthersBigNumber = utils.BigNumber;

export function unray(val) {
  if (val instanceof EthersBigNumber) {
    val = new BigNumber(val.toString());
  }
  return val.div(RAY);
}

export function unwad(val) {
  if (val instanceof EthersBigNumber) {
    val = new BigNumber(val.toString());
  }
  return val.div(WAD);
}
