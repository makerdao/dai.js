import { BigNumber as EthersBigNumber, utils as ethersUtils } from 'ethers';

export function numberToBytes32(num) {
  const bn = EthersBigNumber.from(num);
  return ethersUtils.hexlify(ethersUtils.zeroPad(bn, 32));
}
