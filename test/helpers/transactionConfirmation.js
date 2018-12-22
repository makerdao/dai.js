import { ETH, WETH } from '../../src/eth/Currency';
import TestAccountProvider from './TestAccountProvider';
import { promiseWait } from '../../src/utils';
import { callGanache } from './ganache';
import assert from 'assert';

const WAIT_AFTER_MINE_CALL = 250;

export async function mineBlocks(service, count) {
  if (service.manager().name() !== 'token') {
    service = service.get('token');
  }
  const web3Service = service.get('web3');
  if (!count) count = web3Service.confirmedBlockCount() + 2;

  assert(
    WAIT_AFTER_MINE_CALL > web3Service._pollingInterval * 2,
    'mineBlocks may not work well; pollingInterval is too long'
  );

  const initialNumber = web3Service.blockNumber();

  for (let i = 0; i < count; i++) {
    callGanache('evm_mine');
    await promiseWait(WAIT_AFTER_MINE_CALL);
  }

  const newNumber = web3Service.blockNumber();
  const expectedNumber = initialNumber + count;
  assert(
    newNumber >= expectedNumber,
    `blockNumber should be >= ${expectedNumber}, is ${newNumber}`
  );
}

export function waitForBlocks(service, count) {
  return new Promise(async resolve => {
    if (service.manager().name() !== 'token') {
      service = service.get('token');
    }
    const wethToken = service.getToken(WETH);
    const web3Service = service.get('web3');

    const currentBlock = web3Service.blockNumber();
    const resolveBlock = currentBlock + count;

    for (let i = currentBlock; i < resolveBlock; i++) {
      await wethToken.approveUnlimited(TestAccountProvider.nextAddress());
    }
    const finalise = () => {
      if (web3Service.blockNumber() === resolveBlock) {
        resolve();
      }
      setTimeout(finalise, 200);
    };

    finalise();
  });
}

export function createOutOfEthTransaction(tokenService) {
  const eth = tokenService.getToken(ETH);
  return eth.transfer(TestAccountProvider.nextAddress(), 20000);
}
