import { WETH } from '../../src/eth/Currency';
import TestAccountProvider from './TestAccountProvider';

export function createTestTransaction(tokenService) {
  const wethToken = tokenService.getToken(WETH);
  const promise = wethToken.approveUnlimited(TestAccountProvider.nextAddress());
  const txMgr = tokenService.get('transactionManager');
  return txMgr.getTransaction(promise);
}

export function mineBlocks(tokenService, count = 5) {
  for (let i = 0; i < count; i++) {
    createTestTransaction(tokenService);
  }
}
