import Maker from '../../src/index';
import tokens from '../../contracts/tokens';
import { WETH } from '../../src/eth/Currency';

let maker, cdp, dai, address, exchange, tokenService;

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
    return await tx.confirm();
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
        gasPrice: 12000000000,
        gasLimit: 4000000
      }
    }
  });

  await maker.authenticate();
  tokenService = maker.service('token');
  dai = tokenService.getToken(tokens.DAI);
  address = maker.service('web3').currentAccount();
  exchange = maker.service('exchange');
});

test('can create Maker instance', () => {
  expect(maker).toBeDefined();
});

test(
  'can open a CDP',
  async () => {
    cdp = await maker.openCdp();
    console.info('Opened new CDP');
    expect(cdp).toBeDefined();
  },
  100000
);

test(
  'can lock eth',
  async () => {
    const tx = await cdp.lockEth(0.01);
    await tx.confirm();
    const collateral = await cdp.getCollateralValue();
    console.info(
      'After attempting to lock eth, collateral value is',
      collateral.toString()
    );
    expect(collateral.toString()).toEqual('0.01 ETH');
  },
  2000000
);

test(
  'can withdraw Dai',
  async () => {
    const tx = await cdp.drawDai(0.1);
    await tx.confirm();
    const debt = await cdp.getDebtValue();
    console.info('After attempting to draw Dai, CDP debt is', debt.toString());
    expect(debt.toString()).toEqual('0.10 DAI');
  },
  1000000
);

xtest(
  'can sell Dai',
  async () => {
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
  1000000
);

xtest(
  'can buy Dai',
  async () => {
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
  1000000
);

test(
  'can wipe debt',
  async () => {
    const tx = await cdp.wipeDai('0.1');
    await tx.confirm();
    const debt = await cdp.getDebtValue();
    console.info('After attempting to wipe debt, CDP debt is', debt.toString());
    expect(debt.toString()).toEqual('0.00 DAI');
  },
  10000000
);

test(
  'can shut a CDP',
  async () => {
    const tx = await cdp.shut();
    await tx.confirm();
    await convertPeth();
    await convertWeth();
    const info = await cdp.getInfo();
    expect(info.lad).toBe('0x0000000000000000000000000000000000000000');
  },
  1000000
);
