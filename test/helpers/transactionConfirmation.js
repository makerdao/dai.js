import { WETH } from '../../src/eth/Currency';
import TestAccountProvider from './TestAccountProvider';

export function createTestTransaction(tokenService) {
  const wethToken = tokenService.getToken(WETH);
  return wethToken.approveUnlimited(TestAccountProvider.nextAddress());
}

export function mineBlocks(tokenService, count = 5) {
  for (let i = 0; i < count; i++) {
    createTestTransaction(tokenService);
  }
}
