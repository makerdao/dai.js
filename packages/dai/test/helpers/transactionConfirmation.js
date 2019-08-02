import { ETH } from '../../src/eth/Currency';
import TestAccountProvider from './TestAccountProvider';

export function createOutOfEthTransaction(tokenService) {
  const eth = tokenService.getToken(ETH);
  return eth.transfer(TestAccountProvider.nextAddress(), 20000);
}
