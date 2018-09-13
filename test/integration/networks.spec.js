import Maker from '../../src/index';
import tokens from '../../contracts/tokens';
import { MKR, WETH } from '../../src/eth/Currency';

let maker, cdp, id, dai, address, exchange;

beforeAll(async () => {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('Please set a private key to run integration tests.');
  }

  maker = Maker.create(process.env.NETWORK, {
    privateKey: process.env.PRIVATE_KEY,
    web3: {
      transactionSettings: {
        gasPrice: 12000000000
      }
    }
  });

  await maker.authenticate();
  cdp = await maker.openCdp();
  dai = maker.service('token').getToken(tokens.DAI);
  address = maker.service('web3').currentAccount();
  exchange = maker.service('exchange');
});

test('can create Maker instance', () => {
  expect(maker).toBeDefined();
});

test(
  'can open a CDP',
  async () => {
    id = await cdp.getId();
    console.log('Opened CDP with ID ', id);
    expect(cdp).toBeDefined();
    expect(typeof id).toEqual('number');
  },
  1000000
);

test(
  'can lock eth',
  async () => {
    await cdp.lockEth(0.1);
    const collateral = await cdp.getCollateralValue();
    console.log(
      'After attempting to lock eth, collateral value is ',
      collateral.toString()
    );
    expect(collateral.toString()).toEqual('0.10 ETH');
  },
  1000000
);

test(
  'can withdraw Dai',
  async () => {
    await cdp.drawDai(0.1);
    const debt = await cdp.getDebtValue();
    console.log('After attempting to draw Dai, CDP debt is ', debt.toString());
    expect(debt.toString()).toEqual('0.10 DAI');
  },
  1000000
);

test(
  'can sell Dai',
  async () => {
    const initialBalance = await dai.balanceOf(address);
    console.log(
      'Before attempting to sell Dai, balance is ',
      initialBalance.toString()
    );
    await exchange.sellDai('1', MKR);
    const newBalance = await dai.balanceOf(address);
    console.log(
      'After attempting to sell Dai, balance is ',
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
    console.log(
      'Before attempting to buy Dai, balance is ',
      initialBalance.toString()
    );
    await exchange.buyDai('1', WETH);
    console.log(
      'After attempting to wipe Dai, balance is ',
      newBalance.toString()
    );
    const newBalance = await dai.balanceOf(address);
    expect(parseFloat(newBalance)).toBeGreaterThan(parseFloat(initialBalance));
  },
  1000000
);

test(
  'can wipe debt',
  async () => {
    await cdp.wipeDai('0.1');
    const debt = await cdp.getDebtValue();
    console.log('After attempting to wipe debt, CDP debt is ', debt.toString());
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
