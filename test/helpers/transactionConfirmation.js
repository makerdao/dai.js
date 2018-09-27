import { WETH } from '../../src/eth/Currency';
import TestAccountProvider from './TestAccountProvider';
import { promisify } from '../../src/utils';

function iterate(tokenService, count) {
  for (let i = 0; i < count; i++) {
    createTestTransaction(tokenService);
  }
}

export function createTestTransaction(tokenService) {
  const wethToken = tokenService.getToken(WETH);
  return wethToken.approveUnlimited(TestAccountProvider.nextAddress());
}

export async function mineBlocks(tokenService, count = 5) {
  return promisify(iterate)(tokenService, count);
}
