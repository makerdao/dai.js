import {
  buildTestEthereumTokenService,
  buildTestService
} from '../helpers/serviceBuilders';
import TestAccountProvider from '../helpers/TestAccountProvider';
import TransactionState from '../../src/eth/TransactionState';
import Web3Service from '../../src/eth/Web3Service';
import { promiseWait } from '../../src/utils';
import { ETH, WETH } from '../../src/eth/Currency';

let service;

beforeAll(async () => {
  service = buildTestEthereumTokenService();
  await service.manager().authenticate();
});

function createTestTransaction(srv = service) {
  const wethToken = srv.getToken(WETH);
  const promise = wethToken.approveUnlimited(TestAccountProvider.nextAddress());
  const txMgr = srv.get('transactionManager');
  return txMgr.getTransaction(promise);
}

test('get fees', async () => {
  const tx = await createTestTransaction().mine();
  expect(tx.fees().gt(ETH.wei(20000))).toBeTruthy();
});

test('event listeners work as callbacks', async () => {
  expect.assertions(3);
  const tx = createTestTransaction();
  tx.onPending(() => {
    expect(tx.state()).toBe(TransactionState.pending);
  });
  tx.onMined(() => {
    expect(tx.state()).toBe(TransactionState.mined);

    // create more blocks so that the original tx gets confirmed
    for (let i = 0; i < 3; i++) {
      createTestTransaction();
    }
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
    if (!this.shouldFail) return super.ethersProvider();
    return new Proxy(super.ethersProvider(), {
      get(target, key) {
        if (key === 'getTransactionReceipt') {
          return async () => {
            // await promiseWait(2000);
            throw new Error('test error');
          };
        }
        return target[key];
      }
    });
  }
}

describe('work around problematic test', () => {
  // the test below prints out "unhandled error" warnings even though the error
  // is handled, which we know because the last `expect` in the catch block is
  // called. so we temporarily suppress console.error.
  beforeEach(() => {
    jest.spyOn(global.console, 'error').mockImplementation(() => jest.fn());
  });

  test('error event listener works', async () => {
    expect.assertions(2);
    const service = buildTestService('token', {
      token: true,
      web3: [new FailingWeb3Service(), { provider: { type: 'TEST' } }]
    });
    await service.manager().authenticate();
    const wethToken = service.getToken(WETH);
    const txMgr = service.get('transactionManager');
    service.get('web3').shouldFail = true;

    try {
      const promise = wethToken.approveUnlimited(
        TestAccountProvider.nextAddress()
      );
      const tx = txMgr.getTransaction(promise);
      tx.onError(error => {
        expect(error.message).toEqual('test error');
      });
      await promise;
    } catch (err) {
      expect(err.message).toEqual('test error');
    }
  });
});
