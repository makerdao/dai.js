import callGanache from './callGanache';
import assert from 'assert';

const WAIT_AFTER_MINE_CALL = 250;

export default async function mineBlocks(service, count) {
  let web3Service;
  const serviceName = service.manager().name();
  if (serviceName === 'web3') {
    web3Service = service;
  } else {
    if (serviceName !== 'token') service = service.get('token');
    web3Service = service.get('web3');
  }
  if (!count) count = web3Service.confirmedBlockCount() + 2;

  assert(
    WAIT_AFTER_MINE_CALL > web3Service._pollingInterval * 2,
    'mineBlocks may not work well; pollingInterval is too long'
  );

  // const initialNumber = await web3Service.blockNumber();

  for (let i = 0; i < count; i++) {
    await callGanache('evm_mine');
    await new Promise(resolve => setTimeout(resolve, WAIT_AFTER_MINE_CALL));
  }
  /**
   FIXME: There is a bug affecting "mineBlocks" with how block caching is handled
   in tests when restoring snapshots. Blocknumbers don't update correctly after the first
   restore snapshot, and this assertion in "mineBlocks" fails.
   */

  // const newNumber = await web3Service.blockNumber();
  // const expectedNumber = initialNumber + count;
  // assert(
  //   newNumber >= expectedNumber,
  //   `blockNumber should be >= ${expectedNumber}, is ${newNumber}`
  // );
}
