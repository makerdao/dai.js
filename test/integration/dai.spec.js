import Maker from '../../src/index';
import tokens from '../../contracts/tokens';
import { WETH } from '../../src/eth/Currency';
import debug from 'debug';
import createDaiAndPlaceLimitOrder from '../helpers/oasisHelpers';
import { uniqueId } from '../../src/utils';
import { takeSnapshot, restoreSnapshot } from '../helpers/ganache';

const log = debug('dai:testing:integration');

if (!process.env.PRIVATE_KEY && process.env.NETWORK !== 'test') {
  throw new Error('Please set a private key to run integration tests.');
}

let maker, cdp, exchange, address, tokenService, txMgr, snapshotId;

async function convert(symbol) {
  const token = tokenService.getToken(tokens[symbol]);
  const balance = await token.balanceOf(address);

  if (balance.gt(0.009)) {
    console.info(`Remaining ${symbol} balance is`, balance.toString());
    const method = symbol === 'PETH' ? 'exit' : 'withdraw';
    const op = token[method](balance.toNumber().toFixed(2));
    await txMgr.confirm(op);
    console.info(`Converted remaining ${symbol}`);
  } else {
    console.info(`No remaining ${symbol} to convert`);
  }
}

async function checkWethBalance() {
  const weth = tokenService.getToken(tokens.WETH);
  const wethBalance = await weth.balanceOf(address);

  if (wethBalance.toNumber() < 0.01) {
    console.log(
      'Current balance is ' + wethBalance.toString() + ', depositing 0.01'
    );
    const convert = maker.service('conversion').convertEthToWeth(0.01);
    await txMgr.confirm(convert);
  } else {
    return;
  }
}

describe.each([
  ['with http provider', true],
  ['with websocket provider', false]
])('%s', (name, useHttp) => {
  beforeAll(async () => {
    if (process.env.NETWORK === 'test') snapshotId = await takeSnapshot();

    const settings =
      process.env.NETWORK === 'test'
        ? {
            url: useHttp ? 'http://localhost:2000' : 'ws://localhost:2000',
            web3: {
              transactionSettings: { gasLimit: 4000000 },
              confirmedBlockCount: '0'
            }
          }
        : {
            privateKey: process.env.PRIVATE_KEY,
            url: useHttp
              ? `https://${process.env.NETWORK}.infura.io/`
              : `wss://${process.env.NETWORK}.infura.io/ws`,
            web3: {
              confirmedBlockCount: 1,
              transactionSettings: {
                gasPrice: 15000000000,
                gasLimit: 4000000
              }
            }
          };

    const preset = useHttp ? 'http' : 'ws';
    maker = Maker.create(preset, { ...settings, log: false });

    await maker.authenticate();
    tokenService = maker.service('token');
    address = maker.service('web3').currentAccount();
    exchange = maker.service('exchange');
    txMgr = maker.service('transactionManager');
    txMgr.onNewTransaction(txo => {
      const {
        metadata: { contract, method } = { contract: '???', method: '???' }
      } = txo;
      const label = `tx ${uniqueId(txo)}: ${contract}.${method}`;
      log(`${label}: new`);

      txo.onPending(() => log(`${label}: pending`));
      txo.onMined(() => log(`${label}: mined`));
      txo.onFinalized(() => log(`${label}: confirmed`));
    });
  });

  afterAll(async () => {
    await convert('PETH');
    await convert('WETH');
    if (process.env.NETWORK === 'test') await restoreSnapshot(snapshotId);
  });

  test('can create Maker instance', () => {
    expect(maker).toBeDefined();
  });

  test(
    'can open a CDP',
    async () => {
      cdp = await maker.openCdp();
      console.info('Opened new CDP', cdp.id);
      const open = cdp.transactionObject();
      await txMgr.confirm(open);
      expect(cdp).toBeDefined();
    },
    300000
  );

  test(
    'can lock eth',
    async () => {
      const initialCollateral = await cdp.getCollateralValue();
      const lock = cdp.lockEth(0.01);
      await txMgr.confirm(lock);
      const collateral = await cdp.getCollateralValue();
      expect(collateral.toNumber()).toBeGreaterThan(
        initialCollateral.toNumber()
      );
    },
    600000
  );

  test(
    'can withdraw Dai',
    async () => {
      const initialDebt = await cdp.getDebtValue();
      const draw = cdp.drawDai(0.1);
      await txMgr.confirm(draw);
      const currentDebt = await cdp.getDebtValue();
      expect(currentDebt.toNumber()).toBeGreaterThan(initialDebt.toNumber());
    },
    300000
  );

  test(
    'can sell Dai',
    async () => {
      let tx, error;

      if (process.env.NETWORK === 'test') {
        await createDaiAndPlaceLimitOrder(exchange);
      }

      try {
        tx = await exchange.sellDai('0.1', WETH);
      } catch (err) {
        console.error(err);
        error = err;
      }

      expect(tx).toBeDefined();
      expect(error).toBeUndefined();
    },
    600000
  );

  test(
    'can buy Dai',
    async () => {
      let tx, error;
      await checkWethBalance();

      if (process.env.NETWORK === 'test') {
        await createDaiAndPlaceLimitOrder(exchange, true);
      }

      try {
        tx = await exchange.buyDai('0.1', WETH);
      } catch (err) {
        console.error(err);
        error = err;
      }

      expect(tx).toBeDefined();
      expect(error).toBeUndefined();
    },
    600000
  );

  test(
    'can wipe debt',
    async () => {
      const initialDebt = await cdp.getDebtValue();
      const wipe = cdp.wipeDai('0.1');
      await txMgr.confirm(wipe);
      const currentDebt = await cdp.getDebtValue();
      expect(initialDebt.toNumber()).toBeGreaterThan(currentDebt.toNumber());
    },
    600000
  );

  test(
    'can shut a CDP',
    async () => {
      await cdp.shut();
      const info = await cdp.getInfo();
      expect(info.lad).toBe('0x0000000000000000000000000000000000000000');
    },
    1200000
  );
});
