import Maker from '../../src/index';
import tokens from '../../contracts/tokens';
import { WETH } from '../../src/eth/Currency';
import debug from 'debug';
const log = debug('dai:testing');

let maker, cdp, dai, exchange, address, tokenService;

async function convertPeth() {
  const peth = tokenService.getToken(tokens.PETH);
  const pethBalance = await peth.balanceOf(address);

  if (pethBalance.toNumber() > 0.009) {
    console.info('Remaining PETH balance is', pethBalance.toString());
    const tx = await peth.exit(pethBalance.toNumber().toFixed(2));
    await tx.confirm();
    console.info('Exited remaining PETH');
  } else {
    console.info('No remaining PETH to exit');
  }
}

async function convertWeth() {
  const weth = tokenService.getToken(tokens.WETH);
  const wethBalance = await weth.balanceOf(address);

  if (wethBalance.toNumber() > 0.009) {
    console.info('Remaining WETH balance is', wethBalance.toString());
    const tx = await weth.withdraw(wethBalance.toNumber().toFixed(2));
    await tx.confirm();
    console.info('Withdrew remaining WETH');
  } else {
    console.info('No remaining WETH to withdraw');
  }
}

async function checkWethBalance() {
  const weth = tokenService.getToken(tokens.WETH);
  const wethBalance = await weth.balanceOf(address);

  if (wethBalance.toNumber() < 0.1) {
    console.log(
      'Current balance is ' + wethBalance.toString() + ', depositing 0.1'
    );
    const tx = await maker.service('conversion').convertEthToWeth(0.1);
    return tx.confirm();
  } else {
    return;
  }
}

beforeAll(async () => {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('Please set a private key to run integration tests.');
  }

  maker = Maker.create(process.env.NETWORK, {
    privateKey: process.env.PRIVATE_KEY,
    web3: {
      transactionSettings: {
        gasPrice: 15000000000,
        gasLimit: 4000000
      }
    }
  });

  await maker.authenticate();
  tokenService = maker.service('token');
  dai = tokenService.getToken(tokens.DAI);
  address = maker.service('web3').currentAccount();
  exchange = maker.service('exchange');

  maker.service('transactionManager').onNewTransaction(hybrid => {
    const {
      metadata: { contract, method } = { contract: '???', method: '???' },
      _txId
    } = hybrid;
    const label = `tx ${_txId}: ${contract}.${method}`;
    log(`${label}: new`);

    hybrid.onPending(() => log(`${label}: pending`));
    hybrid.onMined(() => log(`${label}: mined`));
    hybrid.onFinalized(() => log(`${label}: confirmed`));
  });
});

test('can create Maker instance', () => {
  expect(maker).toBeDefined();
});

test(
  'can open a CDP',
  async () => {
    log('test 1');
    cdp = await maker.openCdp().confirm();

    console.info('Opened new CDP', await cdp.getId());
    expect(cdp).toBeDefined();
  },
  300000
);

test(
  'can lock eth',
  async () => {
    log('test 2');
    const tx = await cdp.lockEth(0.01);
    await tx.confirm();
    const collateral = await cdp.getCollateralValue();
    console.info(
      'After attempting to lock eth, collateral value is',
      collateral.toString()
    );
    expect(collateral.toString()).toEqual('0.01 ETH');
  },
  300000
);

test(
  'can withdraw Dai',
  async () => {
    log('test 3');
    const tx = await cdp.drawDai(0.1);
    await tx.confirm();
    const debt = await cdp.getDebtValue();
    console.info('After attempting to draw Dai, CDP debt is', debt.toString());
    expect(debt.toString()).toEqual('0.10 DAI');
  },
  300000
);

test(
  'can sell Dai',
  async () => {
    log('test 4');
    const initialBalance = await dai.balanceOf(address);
    console.info(
      'Before attempting to sell Dai, balance is',
      initialBalance.toString()
    );
    const order = await exchange.sellDai('0.1', WETH);
    await order._hybrid;
    await order._hybrid.confirm();
    const newBalance = await dai.balanceOf(address);
    console.info(
      'After attempting to sell Dai, balance is',
      newBalance.toString()
    );
    expect(parseFloat(newBalance)).toBeLessThan(parseFloat(initialBalance));
  },
  600000
);

test(
  'can buy Dai',
  async () => {
    log('test 5');
    const initialBalance = await dai.balanceOf(address);
    console.info(
      'Before attempting to buy Dai, balance is',
      initialBalance.toString()
    );
    await checkWethBalance();
    const order = await exchange.buyDai('0.1', WETH);
    await order._hybrid;
    await order._hybrid.confirm();
    const newBalance = await dai.balanceOf(address);
    console.info(
      'After attempting to buy Dai, balance is',
      newBalance.toString()
    );
    expect(parseFloat(newBalance)).toBeGreaterThan(parseFloat(initialBalance));
  },
  600000
);

test(
  'can wipe debt',
  async () => {
    log('test 6');
    const tx = await cdp.wipeDai('0.1');
    await tx.confirm();
    const debt = await cdp.getDebtValue();
    console.info('After attempting to wipe debt, CDP debt is', debt.toString());
    expect(debt.toString()).toEqual('0.00 DAI');
  },
  300000
);

test(
  'can shut a CDP',
  async () => {
    log('test 7');
    const tx = await cdp.shut();
    await tx.confirm();
    await convertPeth();
    await convertWeth();
    const info = await cdp.getInfo();
    expect(info.lad).toBe('0x0000000000000000000000000000000000000000');
  },
  300000
);
