import { WETH } from '../../src/eth/Currency';
import TestAccountProvider from './TestAccountProvider';
import debug from 'debug';
const log = debug('dai:testing:mineBlocks');

export function createTestTransaction(tokenService) {
  const wethToken = tokenService.getToken(WETH);
  const promise = wethToken.approveUnlimited(TestAccountProvider.nextAddress());
  const txMgr = tokenService.get('transactionManager');
  return txMgr.getTransaction(promise);
}

export async function mineBlocks(service, count) {
  if (service.manager().name() !== 'token') {
    service = service.get('token');
  }
  const web3Service = service.get('web3');
  if (typeof count !== 'number') {
    count = web3Service.confirmedBlockCount() + 2;
  }
  for (let i = 0; i < count; i++) {
    await createTestTransaction(service).mine();
    log(`block ${web3Service.blockNumber()}`);
  }
}
