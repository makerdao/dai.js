import { ETH, WETH, MKR } from '../../src/eth/Currency';
import TestAccountProvider from './TestAccountProvider';

export function createTestTransaction(tokenService) {
  const wethToken = tokenService.getToken(WETH);
  return wethToken.approveUnlimited(TestAccountProvider.nextAddress());
}

export function createRevertingTransaction(tokenService) {
  const mkr = tokenService.getToken(MKR);
  return mkr.transfer(TestAccountProvider.nextAddress(), '2000000');
}

export function createBelowBaseFeeTransaction(tokenService) {
  const mkr = tokenService.getToken(MKR);
  return mkr._contract.approve(TestAccountProvider.nextAddress(), -1, {
    gasLimit: 4000
  });
}

export function createOutOfGasTransaction(tokenService) {
  const mkr = tokenService.getToken(MKR);
  return mkr._contract.approve(TestAccountProvider.nextAddress(), -1, {
    gasLimit: 40000
  });
}

export function createOutOfEthTransaction(tokenService) {
  const eth = tokenService.getToken(ETH);
  return eth.transfer(TestAccountProvider.nextAddress(), 20000);
}

export function mineBlocks(tokenService, count = 5) {
  for (let i = 0; i < count; i++) {
    createTestTransaction(tokenService);
  }
}
