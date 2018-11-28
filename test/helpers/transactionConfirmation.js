import { ETH, WETH } from '../../src/eth/Currency';
import TestAccountProvider from './TestAccountProvider';
import debug from 'debug';
const log = debug('dai:testing:mineBlocks');

export async function mineBlocks(service, count) {
  if (service.manager().name() !== 'token') {
    service = service.get('token');
  }
  const wethToken = service.getToken(WETH);
  const web3Service = service.get('web3');
  if (typeof count !== 'number') {
    count = web3Service.confirmedBlockCount() + 2;
  }

  for (let i = 0; i < count; i++) {
    await wethToken.approveUnlimited(TestAccountProvider.nextAddress());
    log(`block ${web3Service.blockNumber()}`);
  }
}

export function createOutOfEthTransaction(tokenService) {
  const eth = tokenService.getToken(ETH);
  return eth.transfer(TestAccountProvider.nextAddress(), 20000);
}
