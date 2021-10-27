import {
  buildTestContainer,
  // buildTestEthereumCdpService,
  buildTestSmartContractService
} from '../helpers/serviceBuilders';
import { uniqueId } from '../../src/utils';
// import { mineBlocks } from '@makerdao/test-helpers';
import { mineBlocks } from '../../../test-helpers/src';
import size from 'lodash/size';
import debug from 'debug';
const log = debug('sai:testing:TxMgr.spec');
import Maker from '../../src';
import ScdPlugin from '@makerdao/dai-plugin-scd';

async function scdMaker({
  preset = 'test',
  network = 'testnet',
  addressOverrides,
  ...settings
} = {}) {
  const maker = await Maker.create(preset, {
    plugins: [[ScdPlugin, { addressOverrides, network }]],
    web3: {
      pollingInterval: 100
    },
    ...settings
  });
  await maker.authenticate();
  return maker;
}

function buildTestServices() {
  const container = buildTestContainer({
    smartContract: true,
    transactionManager: true,
    web3: {
      transactionSettings: { gasLimit: 1234567 }
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
    currentAddress: smartContract.get('web3').currentAddress()
  }));
}

let services;

beforeEach(async () => {
  services = await buildTestServices();
});

test('reuse the same web3 service in test services', () => {
  expect(services.contract.manager().isConnected()).toBe(true);
  expect(services.txMgr.manager().isConnected()).toBe(true);
  expect(services.txMgr.get('web3')).toBe(services.contract.get('web3'));
  expect(services.currentAddress).toMatch(/^0x[0-9A-Fa-f]+$/);
});

test('wrapped contract call accepts a businessObject option', async () => {
  expect.assertions(3);
  const token = services.contract.getContract('WETH');

  const businessObject = {
    a: 1,
    add: function(b) {
      return this.a + b;
    }
  };

  const txo = token.approve(services.currentAddress, '1000000000000000000', {
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
  const { txMgr, currentAddress, contract } = services;
  const token = contract.getContract('WETH');
  const gasPrice = await txMgr.get('gas').getGasPrice();
  jest.spyOn(txMgr, '_execute');

  await token.approve(currentAddress, 20000);

  expect(txMgr._execute).toHaveBeenCalledWith(
    token.wrappedContract,
    'approve',
    [currentAddress, 20000],
    {
      gasLimit: 1234567,
      nonce: expect.any(Number),
      gasPrice: gasPrice
    }
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
    initialized: makeListener(label, 'initialized'),
    pending: makeListener(label, 'pending'),
    mined: makeListener(label, 'mined'),
    confirmed: makeListener(label, 'confirmed'),
    error: makeListener(label, 'error')
  });

  beforeAll(async () => {
    const maker = await scdMaker();
    service = await maker.service('cdp');
    await service.manager().authenticate();
    txMgr = service.get('smartContract').get('transactionManager');
    priceService = service.get('price');
    // service = buildTestEthereumCdpService();
    // await service.manager().authenticate();
    // txMgr = service.get('smartContract').get('transactionManager');
    // priceService = service.get('price');
  });

  beforeEach(async () => {
    jest.setTimeout(15000);
    open = service.openCdp();
    cdp = await open;
  });

  afterAll(async () => {
    // set price back to 400s
    await priceService.setEthPrice(400);
  });

  test.only('lifecycle hooks for open and lock', async () => {
    log('open id:', uniqueId(open));
    const openHandlers = makeHandlers('open');

    txMgr.listen(open, openHandlers);
    await Promise.all([txMgr.confirm(open), mineBlocks(service)]);
    expect(openHandlers.initialized).toBeCalled();
    expect(openHandlers.pending).toBeCalled();
    expect(openHandlers.mined).toBeCalled();
    expect(openHandlers.confirmed).toBeCalled();

    const lock = cdp.lockEth(1);
    log('lock id:', uniqueId(lock));
    const lockHandlers = makeHandlers('lock');
    txMgr.listen(lock, lockHandlers);
    await lock;

    // deposit, approve WETH, join, approve PETH, lock
    expect(lockHandlers.initialized).toBeCalledTimes(5);
    expect(lockHandlers.pending).toBeCalledTimes(5);
    expect(lockHandlers.mined).toBeCalledTimes(5);
  });

  test('lifecycle hooks for give', async () => {
    const newCdpAddress = '0x75ac1188e69c815844dd433c2b3ccad1f5a109ff';
    const give = cdp.give(newCdpAddress);
    log('give id:', uniqueId(give));

    const giveHandlers = makeHandlers('give');
    txMgr.listen(give, giveHandlers);
    await give;

    expect(giveHandlers.initialized).toBeCalled();
    expect(giveHandlers.pending).toBeCalled();
    expect(giveHandlers.mined).toBeCalled();
  });

  test('lifecycle hooks for bite', async () => {
    const lock = cdp.lockEth(0.1);
    await Promise.all([lock, mineBlocks(service)]);

    const draw = cdp.drawSai(13);
    await Promise.all([txMgr.confirm(draw), mineBlocks(service)]);

    // set price to make cdp unsafe
    await priceService.setEthPrice(0.01);

    const bite = cdp.bite();
    log('bite id:', uniqueId(bite));

    const biteHandlers = makeHandlers('bite');
    txMgr.listen(bite, biteHandlers);
    await bite;

    expect(biteHandlers.initialized).toBeCalled();
    expect(biteHandlers.pending).toBeCalled();
    expect(biteHandlers.mined).toBeCalled();
  });

  test('clear Tx when state is confirmed/finalized and older than 5 minutes', async () => {
    const openId = uniqueId(open).toString();

    const openHandlers = makeHandlers('open');
    txMgr.listen(open, openHandlers);

    // Subtract 10 minutes from the Tx timestamp
    const myTx = txMgr._tracker.get(openId);
    const minedDate = new Date(myTx._timeStampMined);
    myTx._timeStampMined = new Date(minedDate.getTime() - 600000);

    expect(txMgr._tracker._transactions).toHaveProperty(openId);

    // after calling confirm, Tx state will become 'finalized' and be deleted from list.
    await Promise.all([txMgr.confirm(open), mineBlocks(service)]);

    txMgr._tracker.clearExpiredTransactions();
    expect(Object.keys(txMgr._tracker._transactions)).not.toContain(openId);
    expect(size(txMgr._tracker._listeners)).toEqual(
      size(txMgr._tracker._transactions)
    );
  });

  test('clear Tx when state is error and older than 5 minutes', async () => {
    expect.assertions(4);
    await Promise.all([txMgr.confirm(open), mineBlocks(service)]);

    const lock = cdp.lockEth(0.01);
    await Promise.all([lock, mineBlocks(service)]);

    const draw = cdp.drawSai(1000);
    const drawId = uniqueId(draw).toString();
    const drawTx = txMgr._tracker.get(drawId);
    const drawHandlers = makeHandlers('draw');

    txMgr.listen(draw, drawHandlers);
    expect(txMgr._tracker._transactions).toHaveProperty(drawId);

    try {
      await draw;
    } catch (err) {
      expect(drawTx.isError()).toBe(true);
      expect(drawHandlers.error).toBeCalled();
    }

    // Subtract 10 minutes from the Tx timestamp
    const minedDate = new Date(drawTx._timeStampMined);
    drawTx._timeStampMined = new Date(minedDate.getTime() - 600000);

    txMgr._tracker.clearExpiredTransactions();
    expect(Object.keys(txMgr._tracker._transactions)).not.toContain(drawId);
  });

  test('finalized Tx is set to correct state without without requiring a call to confirm()', async () => {
    const openHandlers = makeHandlers('open');
    txMgr.listen(open, openHandlers);
    const openTx = txMgr._tracker.get(uniqueId(open));

    await mineBlocks(service);

    expect(openTx.isFinalized()).toBe(true);
    expect(openHandlers.confirmed).toBeCalled();
  });

  test('return error message with error callback', async () => {
    const makeListener = () =>
      jest.fn((tx, err) => {
        log('Tx error:', err);
      });

    const makeHandlers = () => ({
      error: makeListener()
    });
    const drawHandlers = makeHandlers();

    await Promise.all([txMgr.confirm(open), mineBlocks(service)]);

    const lock = cdp.lockEth(0.01);
    await Promise.all([lock, mineBlocks(service)]);

    const draw = cdp.drawSai(1000);
    const drawId = uniqueId(draw).toString();
    const drawTx = txMgr._tracker.get(drawId);

    txMgr.listen(draw, drawHandlers);

    try {
      await draw;
    } catch (err) {
      expect(drawTx.isError()).toBe(true);
      expect(drawHandlers.error).toHaveBeenCalledWith(drawTx, err);
    }
  });
});

describe('transaction options', () => {
  let txManager, service, contract;

  beforeEach(async () => {
    service = buildTestSmartContractService();
    await service.manager().authenticate();
    txManager = service.get('transactionManager');
    contract = service.getContract('SAI_TUB');
  });

  test('sets necessary values', async () => {
    let options;
    expect.assertions(2);

    options = await txManager._buildTransactionOptions(
      {},
      contract,
      'open',
      []
    );
    expect(Object.keys(options)).toEqual(['gasLimit', 'gasPrice', 'nonce']);

    txManager.get('gas').disablePrice = true;
    options = await txManager._buildTransactionOptions(
      {},
      contract,
      'open',
      []
    );
    expect(Object.keys(options)).toEqual(['gasLimit', 'nonce']);
  });

  test('passes through explicit options', async () => {
    const options = await txManager._buildTransactionOptions(
      { value: 2 },
      contract,
      'open',
      []
    );
    expect(Object.keys(options)).toEqual([
      'value',
      'gasLimit',
      'gasPrice',
      'nonce'
    ]);
  });
});
