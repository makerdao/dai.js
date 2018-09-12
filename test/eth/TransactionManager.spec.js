import { buildTestContainer } from '../helpers/serviceBuilders';
import tokens from '../../contracts/tokens';

function buildTestServices() {
  const container = buildTestContainer({
    smartContract: true,
    transactionManager: true
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

test('create a Transaction object from a transaction promise', async () => {
  const services = await buildTestServices();
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

test('should properly inject transaction settings and nonce into hybrid transactions', async () => {
  const services = await buildTestServices();
  const firstArgs = await services.txMgr.injectSettings(['0x']);
  const secondArgs = await services.txMgr.injectSettings([
    '0x',
    { _bn: 'some BigNumber' }
  ]);

  expect(Object.keys(firstArgs[firstArgs.length - 1]).includes('nonce')).toBe(
    true
  );
  expect(firstArgs.length).toEqual(2);
  expect(typeof firstArgs[firstArgs.length - 1]).toEqual('object');
  expect(Object.keys(firstArgs[firstArgs.length - 1]).includes('nonce')).toBe(
    true
  );
  expect(secondArgs.length).toEqual(3);
  expect(Object.keys(secondArgs[secondArgs.length - 1]).includes('nonce')).toBe(
    true
  );
  expect(Object.keys(secondArgs[secondArgs.length - 1]).includes('_bn')).toBe(
    false
  );
});

test('should get tx settings from Web3Service and add nonce', async () => {
  const services = await buildTestServices();
  const settings = await services.txMgr.getSettings();

  expect(Object.keys(settings).length).toEqual(
    Object.keys(services.txMgr.get('web3').transactionSettings()).length + 1
  );
  expect(Object.keys(settings).includes('nonce')).toBe(true);
});

test('should parse additional function args', async () => {
  const services = await buildTestServices();
  const dsProxyTestAddress = '0x1234567890123456789012345678901234567890';
  const args = ['0x0000000000000000000000000000000000000000', 1, 2, 3, {
    dsProxyAddress: dsProxyTestAddress,
    metadata: {
      action: {
        foo: 'bar'
      }
    }
  }];
  const { additionalMetadata, dsProxyAddress } = services.txMgr.parseContractFunctionArgs(args);

  expect(dsProxyAddress).toEqual(dsProxyTestAddress);
  expect(Object.keys(additionalMetadata).includes('action')).toBe(true);
  expect(args.length).toBe(4);
});

test('should parse additional function args without affecting last object arg', async () => {
  const services = await buildTestServices();
  const dsProxyTestAddress = '0x1234567890123456789012345678901234567890';
  const args = ['0x0000000000000000000000000000000000000000', 1, 2, 3, {
    dsProxyAddress: dsProxyTestAddress,
    metadata: {
      action: {
        foo: 'bar'
      }
    },
    value: 1,
    gasLimit: 500000
  }];
  const { additionalMetadata, dsProxyAddress } = services.txMgr.parseContractFunctionArgs(args);

  expect(dsProxyAddress).toEqual(dsProxyTestAddress);
  expect(Object.keys(additionalMetadata).includes('action')).toBe(true);
  expect(args.length).toBe(5);
  expect(Object.keys(args[args.length - 1]).includes('value')).toBe(true);
  expect(Object.keys(args[args.length - 1]).includes('gasLimit')).toBe(true);
});
