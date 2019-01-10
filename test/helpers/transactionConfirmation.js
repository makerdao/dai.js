import { ETH } from '../../src/eth/Currency';
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
    await callGanache('evm_mine');
    await promiseWait(WAIT_AFTER_MINE_CALL);
  }

  const newNumber = web3Service.blockNumber();
  const expectedNumber = initialNumber + count;
  assert(
    newNumber >= expectedNumber,
    `blockNumber should be >= ${expectedNumber}, is ${newNumber}`
  );
}

export function createOutOfEthTransaction(tokenService) {
  const eth = tokenService.getToken(ETH);
  return eth.transfer(TestAccountProvider.nextAddress(), 20000);
}
