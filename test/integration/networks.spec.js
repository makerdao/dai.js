import Maker from '../../src/index';
import tokens from '../../contracts/tokens';
import { MKR, WETH } from '../../src/eth/Currency';

let maker, cdp, dai, address, exchange;

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
  cdp = await maker.openCdp();
  console.info('Opened CDP');
  dai = maker.service('token').getToken(tokens.DAI);
  address = maker.service('web3').currentAccount();
  exchange = maker.service('exchange');
});

test('can create Maker instance', () => {
  expect(maker).toBeDefined();
});

test(
  'can open a CDP',
  () => {
    expect(cdp).toBeDefined();
  },
  1000000
);

test(
  'can lock eth',
  async () => {
    await cdp.lockEth(0.01);
    const collateral = await cdp.getCollateralValue();
    console.info(
      'After attempting to lock eth, collateral value is',
      collateral.toString()
    );
    expect(collateral.toString()).toEqual('0.01 ETH');
  },
  1000000
);

test(
  'can withdraw Dai',
  async () => {
    await cdp.drawDai(0.1);
    const debt = await cdp.getDebtValue();
    console.info('After attempting to draw Dai, CDP debt is', debt.toString());
    expect(debt.toString()).toEqual('0.10 DAI');
  },
  1000000
);

test(
  'can sell Dai',
  async () => {
    const initialBalance = await dai.balanceOf(address);
    console.info(
      'Before attempting to sell Dai, balance is',
      initialBalance.toString()
    );
    await exchange.sellDai('0.1', MKR);
    const newBalance = await dai.balanceOf(address);
    console.info(
      'After attempting to sell Dai, balance is',
      newBalance.toString()
    );
    expect(parseFloat(newBalance)).toBeLessThan(parseFloat(initialBalance));
  },
  1000000
);

test(
  'can buy Dai',
  async () => {
    const initialBalance = await dai.balanceOf(address);
    console.info(
      'Before attempting to buy Dai, balance is',
      initialBalance.toString()
    );
    await exchange.buyDai('0.1', WETH);
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
    await cdp.wipeDai('0.1');
    const debt = await cdp.getDebtValue();
    console.info('After attempting to wipe debt, CDP debt is', debt.toString());
    expect(debt.toString()).toEqual('0.00 DAI');
  },
  10000000
);

test(
  'can shut a CDP',
  async () => {
    await cdp.shut();
    const info = await cdp.getInfo();
    expect(info.lad).toBe('0x0000000000000000000000000000000000000000');
  },
  1000000
);
