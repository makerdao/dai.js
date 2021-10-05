import { BigNumber, utils as ethersUtils } from 'ethers';

export function numberToBytes32(num) {
  const bn = BigNumber.from(num);
  return ethersUtils.hexlify(ethersUtils.zeroPad(bn, 32));
}
