import {
  buildTestEthereumTokenService,
  buildTestService
} from '../helpers/serviceBuilders';
import {
  createTestTransaction,
  createRevertingTransaction,
  createOutOfGasTransaction,
  createBelowBaseFeeTransaction,
  //createOutOfEthTransaction,
  mineBlocks
} from '../helpers/transactionConfirmation';
import TransactionState from '../../src/eth/TransactionState';
import Web3Service from '../../src/eth/Web3Service';
import { promiseWait } from '../../src/utils';
import { ETH } from '../../src/eth/Currency';

let service;

beforeAll(async () => {
  service = buildTestEthereumTokenService();
  await service.manager().authenticate();
});

test('event listeners work as promises', async () => {
  expect.assertions(3);
  const tx = createTestTransaction(service);
  tx.onPending().then(tx => {
    expect(tx.state()).toBe(TransactionState.pending);
  });

  tx.onMined().then(tx => {
    expect(tx.state()).toBe(TransactionState.mined);
    mineBlocks(service);
  });

  tx.onFinalized().then(tx => {
    expect(tx.state()).toBe(TransactionState.finalized);
  });

  await tx.confirm();
});

test('onConfirmed alias works like onFinalized', async () => {
  expect.assertions(1);
  const tx = createTestTransaction(service);
  mineBlocks(service);

  tx.onConfirmed().then(tx => {
    expect(tx.state()).toBe(TransactionState.finalized);
  });

  await tx.confirm();
});

test('get fees', async () => {
  const tx = await createTestTransaction(service).mine();
  expect(tx.fees().gt(ETH.wei(20000))).toBeTruthy();
});

test('event listeners work as callbacks', async () => {
  expect.assertions(3);
  const tx = createTestTransaction(service);
  tx.onPending(() => {
    expect(tx.state()).toBe(TransactionState.pending);
  });
  tx.onMined(() => {
    expect(tx.state()).toBe(TransactionState.mined);
    mineBlocks(service);
  });
  tx.onFinalized(() => {
    expect(tx.state()).toBe(TransactionState.finalized);
  });

  await tx.confirm();
});

class DelayingWeb3Service extends Web3Service {
  ethersProvider() {
    return new Proxy(super.ethersProvider(), {
      get(target, key) {
        if (key === 'getTransaction') {
          return async hash => {
            const tx = await target.getTransaction(hash);
            if (!tx) return;
            this._originalTx = tx;
            return { ...tx, blockHash: null };
          };
        }

        if (key === 'waitForTransaction') {
          return () => promiseWait(1000).then(() => this._originalTx);
        }

        return target[key];
      }
    });
  }
}

test('waitForTransaction', async () => {
  const service = buildTestService('token', {
    token: true,
    web3: [new DelayingWeb3Service(), { provider: { type: 'TEST' } }]
  });
  await service.manager().authenticate();

  const tx = createTestTransaction(service);
  await tx.mine();
  expect(tx.state()).toBe('mined');
});

class FailingWeb3Service extends Web3Service {
  ethersProvider() {
    return new Proxy(super.ethersProvider(), {
      get(target, key) {
        if (key === 'getTransactionReceipt') {
          return async () => {
            throw new Error('test error');
          };
        }
        return target[key];
      }
    });
  }
}

test('reverted transaction errors', async () => {
  expect.assertions(4);
  let mined = false;
  const tx = createRevertingTransaction(service);
  tx.onPending(() => {
    expect(tx.state()).toBe(TransactionState.pending);
  });
  tx.onMined(() => {
    mined = true;
  });
  try {
    await tx.mine();
  } catch (err) {
    expect(tx.state()).toEqual(TransactionState.error);
    expect(mined).toBe(false);
    expect(err.message).toMatch('reverted');
  }
});

test('out of gas transaction errors', async () => {
  expect.assertions(4);
  let mined = false;
  const tx = createOutOfGasTransaction(service);
  tx.onPending(() => {
    expect(tx.state()).toBe(TransactionState.pending);
  });
  tx.onMined(() => {
    mined = true;
  });
  try {
    await tx.mine();
  } catch (err) {
    expect(tx.state()).toEqual(TransactionState.error);
    expect(mined).toBe(false);
    expect(err.message).toMatch('reverted');
  }
});

test('below base fee tranaction errors', async () => {
  expect.assertions(2);
  const tx = createBelowBaseFeeTransaction(service);
  try {
    await tx.mine();
  } catch (err) {
    expect(tx.state()).toEqual(TransactionState.error);
    expect(err.message).toEqual('base fee exceeds gas limit');
  }
});

/* FIXME: this causes an issue with the nonce
test('out of eth transaction errors', async () => {
  expect.assertions(1);
  let mined = false;
  const tx = createOutOfEthTransaction(service);
  try {
    await tx;
  } catch (err) {
    expect(err.message).toMatch('enough funds');
  }
});
*/

test('error event listener works', async () => {
  expect.assertions(1);
  const service = buildTestService('token', {
    token: true,
    web3: [new FailingWeb3Service(), { provider: { type: 'TEST' } }]
  });
  await service.manager().authenticate();
  const tx = createTestTransaction(service);
  tx.onError(error => expect(error).toEqual('test error'));
  try {
    await tx;
  } catch (err) {
    // FIXME not sure why this try/catch is necessary...
    // console.log('hmm.', err);
  }
});
