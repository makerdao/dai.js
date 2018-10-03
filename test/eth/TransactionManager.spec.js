import {
  buildTestContainer,
  buildTestEthereumCdpService
} from '../helpers/serviceBuilders';
import tokens from '../../contracts/tokens';
import { uniqueId } from '../../src/utils';
import TestAccountProvider from '../helpers/TestAccountProvider';
import { mineBlocks } from '../helpers/transactionConfirmation';
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

test('wrapped contract call accepts a businessObject option', async () => {
  expect.assertions(3);
  const dai = services.contract.getContractByName(tokens.DAI);

  const businessObject = {
    a: 1,
    add: function(b) {
      return this.a + b;
    }
  };

  const txo = dai.approve(services.currentAccount, '1000000000000000000', {
    businessObject
  });

  services.txMgr.listen(txo, {
    pending: tx => {
      expect(tx.isPending()).toBe(true);
    }
  });
  const bob = await txo;
  expect(services.txMgr.isMined(txo)).toBe(true);
  expect(bob.add(10)).toEqual(11);
});

test('wrapped contract call adds nonce, web3 settings', async () => {
  const { txMgr, currentAccount, contract } = services;
  const dai = contract.getContractByName(tokens.DAI);
  jest.spyOn(txMgr, '_execute');

  await dai.approve(currentAccount, 20000);

  expect(txMgr._execute).toHaveBeenCalledWith(
    dai.wrappedContract,
    'approve',
    [currentAccount, 20000],
    { gasLimit: 1234567, nonce: expect.any(Number) }
  );
});

describe('lifecycle hooks', () => {
  let service, txMgr, priceService, open, cdp;

  const makeListener = (label, state) =>
    jest.fn(tx => {
      const { contract, method } = tx.metadata;
      log(`${label}: ${contract}.${method}: ${state}`);
    });

  const makeHandlers = label => ({
    pending: makeListener(label, 'pending'),
    mined: makeListener(label, 'mined'),
    confirmed: makeListener(label, 'confirmed')
  });

  beforeAll(async () => {
    // This test will fail if unlimited approval for WETH and PETH is already set
    // for the current account. so we pick an account near the end of all the test
    // accounts to make it unlikely that some other test in the suite will use it.
    TestAccountProvider.setIndex(900);

    service = buildTestEthereumCdpService({
      accounts: {
        default: {
          type: 'privateKey',
          privateKey: TestAccountProvider.nextAccount().key
        }
      },
      log: true
    });

    await service.manager().authenticate();
    txMgr = service.get('smartContract').get('transactionManager');
    priceService = service.get('price');
  });

  beforeEach(async () => {
    open = service.openCdp();
    cdp = await open;
  });

  afterAll(async () => {
    // set price back to 400
    await priceService.setEthPrice(400);
  });

  test('lifecycle hooks for open and lock', async () => {
    log('open id:', uniqueId(open));
    const openHandlers = makeHandlers('open');

    txMgr.listen(open, openHandlers);
    await Promise.all([txMgr.confirm(open), mineBlocks(service)]);
    expect(openHandlers.pending).toBeCalled();
    expect(openHandlers.mined).toBeCalled();
    expect(openHandlers.confirmed).toBeCalled();

    const lock = cdp.lockEth(1);
    log('lock id:', uniqueId(lock));

    const lockHandlers = makeHandlers('lock');
    txMgr.listen(lock, lockHandlers);

    // we have to generate new blocks here because lockEth does `confirm`
    await Promise.all([lock, mineBlocks(service)]);

    // deposit, approve WETH, join, approve PETH, lock
    expect(lockHandlers.pending).toBeCalledTimes(5);
    expect(lockHandlers.mined).toBeCalledTimes(5);
    expect(lockHandlers.confirmed).toBeCalledTimes(1); // for converEthToWeth

    log('\ndraw');
    const draw = cdp.drawDai(1);
    await Promise.all([txMgr.confirm(draw), mineBlocks(service)]);

    log('\nwipe');
    const wipe = cdp.wipeDai(1);
    await Promise.all([txMgr.confirm(wipe), mineBlocks(service)]);
  });

  test('lifecycle hooks for give', async () => {
    const newCdpAddress = '0x75ac1188e69c815844dd433c2b3ccad1f5a109ff';
    const give = cdp.give(newCdpAddress);
    log('give id:', uniqueId(give));

    const giveHandlers = makeHandlers('give');
    txMgr.listen(give, giveHandlers);
    await give;

    expect(giveHandlers.pending).toBeCalled();
    expect(giveHandlers.mined).toBeCalled();
  });

  test('lifecycle hooks for bite', async () => {
    const lock = cdp.lockEth(0.1);
    await Promise.all([lock, mineBlocks(service)]);

    const draw = cdp.drawDai(13);
    await Promise.all([txMgr.confirm(draw), mineBlocks(service)]);

    // set price to make cdp unsafe
    await priceService.setEthPrice(0.01);

    const bite = cdp.bite();
    log('bite id:', uniqueId(bite));

    const biteHandlers = makeHandlers('bite');
    txMgr.listen(bite, biteHandlers);
    await bite;

    expect(biteHandlers.pending).toBeCalled();
    expect(biteHandlers.mined).toBeCalled();
  });
});
