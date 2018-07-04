import { buildTestEthereumCdpService } from '../helpers/serviceBuilders';
import tokens from '../../contracts/tokens';

let cdpService, cdp, defaultAccount, dai;

beforeAll(async () => {
  cdpService = buildTestEthereumCdpService();
  await cdpService.manager().authenticate();
  defaultAccount = cdpService
    .get('token')
    .get('web3')
    .defaultAccount();
  dai = cdpService.get('token').getToken(tokens.DAI);
});

afterAll(async () => {
  // other tests expect this to be the case
  await cdpService.get('price').setEthPrice('400');
});

async function openCdp() {
  cdp = await cdpService.openCdp();
  return cdp.getId();
}

describe('basic checks', () => {
  let id;

  beforeAll(async () => {
    id = await openCdp();
  });

  test('check ID', () => {
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  test('lookup by ID', async () => {
    expect.assertions(2);
    const info = await cdpService.getInfo(id);
    expect(info).toBeTruthy();
    expect(info.lad).toMatch(/^0x[A-Fa-f0-9]{40}$/);
  });

  test('shut', async () => {
    await cdp.shut(id);
    const info = await cdp.getInfo();
    expect(info.lad).toBe('0x0000000000000000000000000000000000000000');
  });
});

describe('weth and peth', () => {
  let wethToken, pethToken;

  beforeAll(() => {
    const tokenService = cdpService.get('token');
    wethToken = tokenService.getToken(tokens.WETH);
    pethToken = tokenService.getToken(tokens.PETH);
  });

  afterAll(async () => {
    await wethToken.approve(cdpService._tubContract().getAddress(), '0');
    await pethToken.approve(cdpService._tubContract().getAddress(), '0');
  });

  test('lock weth in a cdp', async () => {
    const id = await openCdp();

    await wethToken.deposit('0.1');
    const balancePre = await wethToken.balanceOf(defaultAccount);
    const cdpInfoPre = await cdpService.getInfo(id);
    await cdpService.lockWeth(id, '0.1');
    const cdpInfoPost = await cdpService.getInfo(id);
    const balancePost = await wethToken.balanceOf(defaultAccount);

    expect(cdpInfoPre.ink.toString()).toEqual('0');
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
    expect(balancePre.minus(0.1)).toEqual(balancePost);
  });

  test('lock peth in a cdp', async () => {
    const id = await openCdp();

    await wethToken.deposit('0.1');
    await wethToken.approve(cdpService._tubContract().getAddress(), '0.1');
    await pethToken.join('0.1');

    const balancePre = await pethToken.balanceOf(defaultAccount);
    const cdpInfoPre = await cdpService.getInfo(id);
    await cdpService.lockPeth(id, '0.1');
    const cdpInfoPost = await cdpService.getInfo(id);
    const balancePost = await pethToken.balanceOf(defaultAccount);

    expect(cdpInfoPre.ink.toString()).toEqual('0');
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
    expect(balancePre.minus(0.1)).toEqual(balancePost);
  });
});

test('transfer ownership', async () => {
  const newAddress = '0x046Ce6b8eCb159645d3A605051EE37BA93B6efCc';
  await openCdp();
  const info = await cdp.getInfo();
  await cdp.give(newAddress);
  const info2 = await cdp.getInfo();
  expect(info2.lad).not.toEqual(info.lad);
  expect(info2.lad).toEqual(newAddress);
});

// Also test that biting a safe cdp throws an error
test('bite', async () => {
  await openCdp();
  await cdp.lockEth('0.1');
  await cdp.drawDai('13');
  const id = await cdp.getId();
  await cdpService.get('price').setEthPrice('0.01');
  const result = await cdpService.bite(id);
  await cdpService.get('price').setEthPrice('400'); // for other tests in this file
  expect(typeof result).toEqual('object');
});

describe('a cdp with collateral', () => {
  let id;

  beforeAll(async () => {
    id = await openCdp();
    await cdp.lockEth('0.2');
  });

  test('read ink', async () => {
    const info = await cdpService.getInfo(id);
    expect(info.ink.toString()).toBe('200000000000000000');
  });

  test('read locked collateral in peth', async () => {
    const debt = await cdp.getCollateralValueInPeth();
    expect(debt.toString()).toEqual('0.2');
  });

  test('read locked collateral in eth', async () => {
    const debt = await cdp.getCollateralValueInEth();
    expect(debt.toString()).toEqual('0.2');
  });

  test('read locked collateral in USD', async () => {
    const debt = await cdp.getCollateralValueInUSD();
    expect(debt.toString()).toEqual('80');
  });

  describe('with debt', () => {
    beforeAll(() => cdp.drawDai('5'));

    test('read debt in dai', async () => {
      const debt = await cdp.getDebtValueInDai();
      expect(debt.toString()).toEqual('5');
    });

    test('read debt in usd', async () => {
      const debt = await cdp.getDebtValueInUSD();
      expect(debt.toString()).toEqual('5');
    });

    test('read liquidation price', async () => {
      const price = await cdp.getLiquidationPriceEthUSD();
      expect(price.toString()).toEqual('37.5');
    });

    test('check if cdp is safe', async () => {
      expect(await cdp.isSafe()).toBe(true);
    });

    test('read collateralization ratio', async () => {
      const ethPerPeth = await cdpService.get('price').getWethToPethRatio();
      const collateralizationRatio = await cdp.getCollateralizationRatio();
      expect(collateralizationRatio).toBeCloseTo(16 * ethPerPeth);
    });

    test('wipe', async () => {
      const balance1 = parseFloat(await dai.balanceOf(defaultAccount));
      await cdp.wipeDai('5');
      const balance2 = parseFloat(await dai.balanceOf(defaultAccount));
      expect(balance2 - balance1).toBeCloseTo(-5);
      const debt = await cdp.getDebtValueInDai();
      expect(debt.toString()).toEqual('0');
    });

    test('free', async () => {
      await cdp.freePeth('0.1');
      const info = await cdp.getInfo();
      expect(info.ink.toString()).toEqual('100000000000000000');
    });

    test('shut', async () => {
      await cdp.shut();
      const info = await cdp.getInfo();
      expect(info.lad).toBe('0x0000000000000000000000000000000000000000');
    });
  });
});

test('can read the liquidation ratio', async () => {
  const liquidationRatio = await cdpService.getLiquidationRatio();
  expect(liquidationRatio.toString()).toEqual('1.5');
});

test('can read the liquidation penalty', async () => {
  const liquidationPenalty = await cdpService.getLiquidationPenalty();
  expect(liquidationPenalty.toString()).toEqual('0.13');
});

test('can read the annual governance fee', async () => {
  const governanceFee = await cdpService.getAnnualGovernanceFee();
  expect(governanceFee.toFixed(3)).toEqual('0.005');
});

test('can read the target price', async () => {
  const tp = await cdpService.getTargetPrice();
  expect(tp).toBe(1);
});

test('can calculate system collateralization', async () => {
  await openCdp();
  const scA = await cdpService.getSystemCollateralization();

  await cdp.lockEth('0.1');
  const scB = await cdpService.getSystemCollateralization();
  expect(scB).toBeGreaterThan(scA);

  await cdp.drawDai('10');
  const scC = await cdpService.getSystemCollateralization();
  expect(scB).toBeGreaterThan(scC);
});
