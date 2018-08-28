import { buildTestContainer } from '../helpers/serviceBuilders';
import tokens from '../../contracts/tokens';

function buildTestServices() {
  const container = buildTestContainer({
    smartContract: true,
    transactionManager: true,
    nonce: true
  });
  const smartContract = container.service('smartContract');
  const transactionManager = container.service('transactionManager');
  const nonce = container.service('nonce');

  return Promise.all([
    smartContract.manager().authenticate(),
    transactionManager.manager().authenticate()
  ]).then(() => ({
    contract: smartContract,
    txMgr: transactionManager,
    nonce: nonce,
    currentAccount: smartContract.get('web3').currentAccount()
  }));
}

test('should reuse the same web3 and log service in test services', done => {
  buildTestServices().then(services => {
    expect(services.contract.manager().isConnected()).toBe(true);
    expect(services.txMgr.manager().isConnected()).toBe(true);
    expect(services.txMgr.get('web3')).toBe(services.contract.get('web3'));
    expect(services.txMgr.get('log')).toBe(
      services.contract.get('web3').get('log')
    );
    expect(services.currentAccount).toMatch(/^0x[0-9A-Fa-f]+$/);
    done();
  });
});

test('should create a Transaction object based on a Contract transaction promise', done => {
  buildTestServices().then(services => {
    const contractTransaction = services.contract
        .getContractByName(tokens.DAI, { hybrid: false })
        .approve(services.currentAccount, '1000000000000000000'),
      businessObject = { x: 1 },
      hybrid = services.txMgr.createHybridTx(contractTransaction, {
        businessObject
      });

    expect(contractTransaction.toString()).toEqual('[object Promise]');
    expect(hybrid.toString()).toEqual('[object Promise]');
    expect(hybrid._original._transaction).toBe(contractTransaction);
    expect(hybrid._original._businessObject).toBe(businessObject);
    expect(hybrid._original._web3Service).toBe(services.txMgr.get('web3'));

    hybrid.then(() => {
      expect(hybrid._original.isMined()).toBe(true);
      done();
    });
  });
});

test('should register all created transaction hybrids', done => {
  buildTestServices().then(services => {
    const contractTransaction = services.contract
        .getContractByName(tokens.DAI, { hybrid: false })
        .approve(services.currentAccount, '1000000000000000000'),
      hybrids = [
        services.txMgr.createHybridTx(contractTransaction),
        services.txMgr.createHybridTx(contractTransaction),
        services.txMgr.createHybridTx(contractTransaction)
      ];

    expect(services.txMgr.getTransactions().length).toBe(3);
    expect(services.txMgr.getTransactions()).toEqual(hybrids);
    Promise.all(hybrids).then(() => done());
  });
});

test('should add businessObject functions, getters, and setters', done => {
  buildTestServices().then(services => {
    const contractTransaction = services.contract
        .getContractByName(tokens.DAI, { hybrid: false })
        .approve(services.currentAccount, '1000000000000000000'),
      businessObject = {
        a: 1,
        oneTwo: 2,
        add: function(b) {
          return this.a + b;
        },
        mul: function(b, c) {
          return this.a * b * c;
        },
        add2: b => 10 + b,
        mul2: (b, c) => 10 * b * c
      },
      hybrid = services.txMgr.createHybridTx(contractTransaction, {
        businessObject
      });

    expect(hybrid.getA()).toBe(1);
    expect(
      hybrid
        .setA(10)
        .setOneTwo(12)
        .getA()
    ).toBe(10);
    expect(hybrid.getOneTwo()).toBe(12);
    expect(hybrid.add(5)).toBe(15);
    expect(hybrid.mul(2, 3)).toBe(60);
    expect(hybrid.add2(5)).toBe(15);
    expect(hybrid.mul2(2, 3)).toBe(60);
    done();
  });
});

test('should add TransactionLifeCycle functions', async () => {
  const services = await buildTestServices();
  const contractTransaction = services.contract
      .getContractByName(tokens.DAI, { hybrid: false })
      .approve(services.currentAccount, '1000000000000000000'),
    businessObject = {
      a: 1,
      oneTwo: 2,
      add: function(b) {
        return this.a + b;
      },
      mul: function(b, c) {
        return this.a * b * c;
      },
      add2: b => 10 + b,
      mul2: (b, c) => 10 * b * c
    },
    hybrid = services.txMgr.createHybridTx(contractTransaction, {
      businessObject
    });

  expect(typeof hybrid._assertBlockHashUnchanged).toBe('undefined');
  expect(typeof hybrid.timeStampSubmitted).toBe('undefined');

  await hybrid.onPending();
  expect(hybrid.isPending()).toBe(true);
  await hybrid.onMined();
  expect(hybrid.isMined()).toBe(true);
});

test('should properly format hybrid transaction object with injected nonce and add TransactionLifecycle functions', async () => {
  const services = await buildTestServices(),
    hybrid = services.txMgr.formatHybridTx(
      services.contract.getContractByName(tokens.DAI, { hybrid: false }),
      'approve',
      [services.currentAccount, '1000000000000000000'],
      'DAI'
    );

  await hybrid.onPending();
  expect(hybrid.isPending()).toBe(true);
  await hybrid.onMined();
  expect(hybrid.isMined()).toBe(true);
});
