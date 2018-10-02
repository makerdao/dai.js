import {
  buildTestEthereumTokenService,
  buildTestService
} from '../helpers/serviceBuilders';
import TestAccountProvider from '../helpers/TestAccountProvider';
import {
  //createOutOfEthTransaction,
  mineBlocks
} from '../helpers/transactionConfirmation';
import TransactionState from '../../src/eth/TransactionState';
import Web3Service from '../../src/eth/Web3Service';
import { promiseWait } from '../../src/utils';
import { ETH, MKR, WETH } from '../../src/eth/Currency';

let service, mkr, testAddress;

function createTestTransaction(tokenService) {
  const wethToken = tokenService.getToken(WETH);
  const promise = wethToken.approveUnlimited(TestAccountProvider.nextAddress());
  const txMgr = tokenService.get('transactionManager');
  return [promise, txMgr.getTransaction(promise)];
}

describe('normal web service behavior', () => {
  beforeEach(async () => {
    service = buildTestEthereumTokenService();
    await service.manager().authenticate();
    mkr = service.getToken(MKR);
    testAddress = TestAccountProvider.nextAddress();
  });

  test('onConfirmed alias works like onFinalized', async () => {
    expect.assertions(1);
    const [promise, tx] = createTestTransaction(service);
    tx.onConfirmed(tx => {
      expect(tx.state()).toBe(TransactionState.finalized);
    });
    await promise;
    await Promise.all([tx.confirm(), mineBlocks(service)]);
  });

  test('get fees', async () => {
    const [promise, tx] = createTestTransaction(service);
    await promise;
    expect(tx.fees().gt(ETH.wei(20000))).toBeTruthy();
  });

  test('event listeners work as callbacks', async () => {
    expect.assertions(3);
    const [promise, tx] = createTestTransaction(service);
    tx.onPending(() => {
      expect(tx.state()).toBe(TransactionState.pending);
    });
    tx.onMined(() => {
      expect(tx.state()).toBe(TransactionState.mined);
    });
    tx.onFinalized(() => {
      expect(tx.state()).toBe(TransactionState.finalized);
    });
    await promise;
    await Promise.all([tx.confirm(), mineBlocks(service)]);
  });

  describe('reverted transaction handling', () => {
    const testErrorHandling = (
      operation,
      errorMessageMatch,
      checkPending = true
    ) => async () => {
      expect.assertions(checkPending ? 5 : 4);
      let mined = false;
      const promise = operation();
      const tx = service.get('transactionManager').getTransaction(promise);

      if (checkPending) {
        tx.onPending(() => {
          expect(tx.state()).toBe(TransactionState.pending);
        });
      }
      tx.onMined(() => {
        mined = true;
      });
      tx.onError(err => {
        expect(err.message).toMatch(errorMessageMatch);
      });

      try {
        await promise;
      } catch (err) {
        expect(tx.state()).toEqual(TransactionState.error);
        expect(mined).toBe(false);
        expect(err.message).toMatch(errorMessageMatch);
      }
    };

    test(
      'generic error',
      testErrorHandling(() => mkr.transfer(testAddress, '2000000'), /reverted/)
    );

    test(
      'out of gas',
      testErrorHandling(
        () => mkr.approveUnlimited(testAddress, { gasLimit: 40000 }),
        /reverted/
      )
    );

    test(
      'gas limit below base fee',
      testErrorHandling(
        () => mkr.approveUnlimited(testAddress, { gasLimit: 20 }),
        /base fee exceeds gas limit/,
        false
      )
    );

    test('not enough ETH', async () => {
      expect.assertions(1);
      const ether = service.getToken(ETH);
      const promise = ether.transfer(testAddress, 20000);
      try {
        await promise;
      } catch (err) {
        expect(err.message).toMatch('enough funds');
      }
    });
  });
});

class DelayingWeb3Service extends Web3Service {
  ethersProvider() {
    if (!this.shouldDelay) return super.ethersProvider();
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
  service.get('web3').shouldDelay = true;
  const [promise, tx] = createTestTransaction(service);
  await promise;
  expect(tx.state()).toBe('mined');
});
