import {
  buildTestEthereumTokenService,
  buildTestService
} from '../helpers/serviceBuilders';
import tokens from '../../contracts/tokens';
import TestAccountProvider from '../../src/utils/TestAccountProvider';
import TransactionState from '../../src/eth/TransactionState';
import Web3Service from '../../src/eth/Web3Service';

let service;

beforeAll(() => {
  service = buildTestEthereumTokenService();
  return service.manager().authenticate();
});

function createTestTransaction(srv = service) {
  const wethToken = srv.getToken(tokens.WETH);
  return wethToken.approveUnlimited(TestAccountProvider.nextAddress());
}

test('TransactionObject event listeners work as promises', async () => {
  expect.assertions(3);
  const tx = createTestTransaction();

  tx.onPending().then(tx => {
    expect(tx.state()).toBe(TransactionState.pending);
  });

  tx.onMined().then(tx => {
    expect(tx.state()).toBe(TransactionState.mined);

    // create more blocks so that the original tx gets confirmed
    for (let i = 0; i < 3; i++) {
      createTestTransaction();
    }
  });

  tx.onFinalized().then(tx => {
    expect(tx.state()).toBe(TransactionState.finalized);
  });

  await tx.confirm();
});

test('get fees from TransactionObject', async () => {
  const tx = await createTestTransaction().mine();
  expect(parseFloat(tx.fees())).toBeGreaterThan(0);
});

test('TransactionObject event listeners work as callbacks', async () => {
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

class FailingWeb3Service extends Web3Service {
  ethersProvider() {
    return new Proxy(super.ethersProvider(), {
      get(target, key) {
        if (key === 'getTransaction') {
          return () =>
            new Promise(() => {
              throw new Error('test error');
            });
        }
        return target[key];
      }
    });
  }
}

test('TransactionObject error event listener works', async () => {
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
