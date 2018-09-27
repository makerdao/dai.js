import {
  buildTestContainer,
  buildTestEthereumCdpService
} from '../helpers/serviceBuilders';
import tokens from '../../contracts/tokens';
import { uniqueId } from '../../src/utils';
import TestAccountProvider from '../helpers/TestAccountProvider';
import debug from 'debug';
const log = debug('dai:testing:TxMgr.spec');

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

test('createHybridTx resolves to business object', async () => {
  expect.assertions(3);

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

  services.txMgr.listen(hybrid, {
    pending: tx => {
      expect(tx.isPending()).toBe(true);
    }
  });
  const bob = await hybrid;
  expect(services.txMgr.isMined(hybrid)).toBe(true);
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

  await hybrid;

  expect(txMgr._execute).toHaveBeenCalledWith(
    dai,
    'approve',
    [currentAccount, 20000],
    { gasLimit: 1234567, nonce: expect.any(Number) }
  );
});

test('lifecycle hooks', async () => {
  TestAccountProvider.setIndex(599);
  const service = buildTestEthereumCdpService({
    accounts: {
      default: {
        type: 'privateKey',
        privateKey: TestAccountProvider.nextAccount().key
      }
    },
    log: true
  });
  await service.manager().authenticate();
  const txMgr = service.get('smartContract').get('transactionManager');
  const priceService = service.get('price');
  // const web3Service = service.get('smartContract').get('web3');
  const ethPrice = await priceService.getEthPrice();

  // do busywork to create new blocks, assuming insta-mining is on
  const waitForNewBlocks = async (count = 5) => {
    for (let i = 0; i < count; i++) {
      await priceService.setEthPrice(ethPrice);
      // log('block:', web3Service.blockNumber());
    }
  };

  const open = service.openCdp();
  log('open id:', uniqueId(open));

  txMgr.listen(open, {
    pending: tx => {
      const { contract, method } = tx.metadata;
      log(`open handler: pending: ${contract}.${method}`);
    },
    mined: tx => {
      const { contract, method } = tx.metadata;
      log(`open handler: mined: ${contract}.${method}`);
    }
  });

  await Promise.all([txMgr.confirm(open), waitForNewBlocks()]);

  const cdp = await open;
  const lock = cdp.lockEth(1);
  log('lock id:', uniqueId(lock));

  txMgr.listen(lock, {
    pending: tx => {
      const { contract, method } = tx.metadata;
      log(`lock handler: pending: ${contract}.${method}`);
    },
    mined: tx => {
      const { contract, method } = tx.metadata;
      log(`lock handler: mined: ${contract}.${method}`);
    }
  });

  await lock;

  log('\ndraw');
  const draw = cdp.drawDai(1);
  await Promise.all([txMgr.confirm(draw), waitForNewBlocks()]);

  log('\nwipe');
  const wipe = cdp.wipeDai(1);
  await Promise.all([txMgr.confirm(wipe), waitForNewBlocks()]);
});
