import callGanache from './callGanache';
import assert from 'assert';

const WAIT_AFTER_MINE_CALL = 250;

export default async function mineBlocks(service, count) {
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
    await new Promise(resolve => setTimeout(resolve, WAIT_AFTER_MINE_CALL));
  }

  const newNumber = web3Service.blockNumber();
  const expectedNumber = initialNumber + count;
  assert(
    newNumber >= expectedNumber,
    `blockNumber should be >= ${expectedNumber}, is ${newNumber}`
  );
}
