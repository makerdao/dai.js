import { buildTestContainer } from '../helpers/serviceBuilders';
import tokens from '../../contracts/tokens';

function buildTestServices() {
  const container = buildTestContainer({
    smartContract: true,
    transactionManager: true,
    web3: {
      provider: {
        type: 'TEST'
      },
      transactionSettings: {
        gasLimit: 1234567
      }
    }
  });
  const smartContract = container.service('smartContract');
  const transactionManager = container.service('transactionManager');

  return Promise.all([
    smartContract.manager().authenticate(),
    transactionManager.manager().authenticate()
  ]).then(() => ({
    contract: smartContract,
    txMgr: transactionManager,
    currentAccount: smartContract.get('web3').currentAccount()
  }));
}

let services;

beforeEach(async () => {
  services = await buildTestServices();
});

test('reuse the same web3 and log service in test services', () => {
  expect(services.contract.manager().isConnected()).toBe(true);
  expect(services.txMgr.manager().isConnected()).toBe(true);
  expect(services.txMgr.get('web3')).toBe(services.contract.get('web3'));
  expect(services.txMgr.get('log')).toBe(
    services.contract.get('web3').get('log')
  );
  expect(services.currentAccount).toMatch(/^0x[0-9A-Fa-f]+$/);
});

test('create a Transaction object from a transaction promise', async () => {
  const contractTransaction = services.contract
      .getContractByName(tokens.DAI, { hybrid: false })
      .approve(services.currentAccount, '1000000000000000000'),
    businessObject = { x: 1 },
    hybrid = services.txMgr.createHybridTx(contractTransaction, {
      businessObject
    });

  expect(contractTransaction).toBeInstanceOf(Promise);
  expect(hybrid._original._transaction).toBe(contractTransaction);
  expect(hybrid._original._businessObject).toBe(businessObject);
  expect(hybrid._original._web3Service).toBe(services.txMgr.get('web3'));

  return hybrid.then(() => {
    expect(hybrid._original.isMined()).toBe(true);
  });
});

test('register all created transaction hybrids', async () => {
  const contractTransaction = services.contract
      .getContractByName(tokens.DAI, { hybrid: false })
      .approve(services.currentAccount, '1000000000000000000'),
    hybrids = [
      services.txMgr.createHybridTx(contractTransaction),
      services.txMgr.createHybridTx(contractTransaction),
      services.txMgr.createHybridTx(contractTransaction)
    ];

  await Promise.all(hybrids);
  expect(services.txMgr.getTransactions().length).toBe(3);
  expect(services.txMgr.getTransactions()).toEqual(hybrids);
});

test('createHybridTx adds hooks and resolves to business object', async () => {
  const contractTransaction = services.contract
      .getContractByName(tokens.DAI, { hybrid: false })
      .approve(services.currentAccount, '1000000000000000000'),
    businessObject = {
      a: 1,
      add: function(b) {
        return this.a + b;
      }
    },
    hybrid = services.txMgr.createHybridTx(contractTransaction, {
      businessObject
    });

  await hybrid.onPending();
  expect(hybrid.isPending()).toBe(true);
  const bob = await hybrid.onMined();
  expect(hybrid.isMined()).toBe(true);
  expect(bob.add(10)).toEqual(11);
});

test('formatHybridTx adds nonce, web3 settings, lifecycle hooks', async () => {
  const { txMgr, currentAccount, contract } = services;
  const dai = contract.getContractByName(tokens.DAI, { hybrid: false });
  jest.spyOn(txMgr, '_execute');

  const hybrid = txMgr.formatHybridTx(
    dai,
    'approve',
    [currentAccount, 20000],
    'DAI'
  );

  await hybrid.onMined();
  expect(hybrid.isMined()).toBe(true);

  expect(txMgr._execute).toHaveBeenCalledWith(
    dai,
    'approve',
    [currentAccount, 20000],
    { gasLimit: 1234567, nonce: expect.any(Number) }
  );
});
