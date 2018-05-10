import SmartContractService from '../../src/eth/SmartContractService';
import TransactionManager from '../../src/eth/TransactionManager';
import TransactionState from '../../src/eth/TransactionState';
import tokens from '../../contracts/tokens';

function buildTestServices() {
  const smartContract = SmartContractService.buildTestService(),
    transactionManager = TransactionManager.buildTestService(smartContract.get('web3'));

  return Promise.all([
    smartContract.manager().authenticate(),
    transactionManager.manager().authenticate()]
  ).then(() => ({
    contract: smartContract,
    txMgr: transactionManager,
    defaultAccount: smartContract.get('web3').defaultAccount()
  }));
}

test('should reuse the same web3 and log service in test services', done => {
  buildTestServices().then(services => {
    expect(services.contract.manager().isConnected()).toBe(true);
    expect(services.txMgr.manager().isConnected()).toBe(true);
    expect(services.txMgr.get('web3')).toBe(services.contract.get('web3'));
    expect(services.txMgr.get('log')).toBe(services.contract.get('web3').get('log'));
    expect(services.defaultAccount).toMatch(/^0x[0-9A-Fa-f]+$/);
    done();
  });
});

test('should create a Transaction object based on a Contract transaction promise', done => {
  buildTestServices().then(services => {
    const contractTransaction = services.contract.getContractByName(tokens.DAI)
      .approve(services.defaultAccount, '1000000000000000000'),
      businessObject = { x:1 },
      hybrid = services.txMgr.createTransactionHybrid(contractTransaction, businessObject);

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

test('should resolve the hybrid object when its implicit state is reached', done => {
  buildTestServices().then(services => {
    const contract = services.contract.getContractByName(tokens.DAI),
      contractTransaction =
        contract.approve(services.defaultAccount, '1000000000000000000'),
      pendingStatehybrid =
        services.txMgr.createTransactionHybrid(contractTransaction, null, TransactionState.pending),
      minedStatehybrid =
        services.txMgr.createTransactionHybrid(contractTransaction, null, TransactionState.mined),
      finalizedStatehybrid =
        services.txMgr.createTransactionHybrid(contractTransaction, null, TransactionState.finalized);

    pendingStatehybrid
      .then(() => {
        expect(pendingStatehybrid._original.isPending()).toBe(true);
        return minedStatehybrid;
      })
      .then(() => {
        expect(pendingStatehybrid._original.isMined()).toBe(true);

        let finished = false;
        finalizedStatehybrid.then(() => {
          expect(finalizedStatehybrid._original.isFinalized()).toBe(true);
          finished = true;
          done();
        });

        const RequiredConfirmations = 3; // Update this when the value in TransactionObject changes!!
        for (let i=0; !finished && i<RequiredConfirmations; i++) {
          contract.approve(services.defaultAccount, '1000000000000000000');
        }
      });

  });
});

test('should reject invalid implicit states', done => {
  buildTestServices().then(services => {
    const contractTransaction = services.contract.getContractByName(tokens.DAI)
      .approve(services.defaultAccount, '1000000000000000000');

    expect(() =>
      services.txMgr.createTransactionHybrid(contractTransaction, null, TransactionState.initialized))
      .toThrow('Invalid implicit transaction state: initialized');

    expect(() =>
      services.txMgr.createTransactionHybrid(contractTransaction, null, TransactionState.error))
      .toThrow('Invalid implicit transaction state: error');

    expect(() =>
      services.txMgr.createTransactionHybrid(contractTransaction, null, 'NOT_A_STATE'))
      .toThrow('Invalid implicit transaction state: NOT_A_STATE');

    done();
  });
});

test('should add businessObject functions, getters, and setters', done => {
  buildTestServices().then(services => {
    const contractTransaction = services.contract.getContractByName(tokens.DAI)
        .approve(services.defaultAccount, '1000000000000000000'),

      businessObject = {
        a: 1,
        oneTwo: 2,
        add: function (b) {
          return this.a + b;
        },
        mul: function (b, c) {
          return this.a * b * c;
        },
        add2: b => 10 + b,
        mul2: (b, c) => 10 * b * c
      },

      hybrid = services.txMgr.createTransactionHybrid(contractTransaction, businessObject);

    expect(hybrid.getA()).toBe(1);
    expect(hybrid.setA(10).setOneTwo(12).getA()).toBe(10);
    expect(hybrid.getOneTwo()).toBe(12);
    expect(hybrid.add(5)).toBe(15);
    expect(hybrid.mul(2, 3)).toBe(60);
    expect(hybrid.add2(5)).toBe(15);
    expect(hybrid.mul2(2, 3)).toBe(60);
    done();
  });
});

test('should add TransactionLifeCycle functions', done => {
  buildTestServices().then(services => {
    const contractTransaction = services.contract.getContractByName(tokens.DAI)
        .approve(services.defaultAccount, '1000000000000000000'),

      businessObject = {
        a: 1,
        oneTwo: 2,
        add: function (b) {
          return this.a + b;
        },
        mul: function (b, c) {
          return this.a * b * c;
        },
        add2: b => 10 + b,
        mul2: (b, c) => 10 * b * c
      },

      hybrid = services.txMgr.createTransactionHybrid(contractTransaction, businessObject);

    expect(typeof hybrid._assertBlockHashUnchanged).toBe('undefined');
    expect(typeof hybrid.timeStampSubmitted).toBe('undefined');

    hybrid
      .onPending()
      .then(() => {
        expect(hybrid.isPending()).toBe(true);
        return hybrid.onMined();
      })
      .then(() => {
        expect(hybrid.isMined()).toBe(true);
        done();
      });
  });
});
