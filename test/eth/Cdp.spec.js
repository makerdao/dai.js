import { buildTestEthereumCdpService } from '../helpers/serviceBuilders';
import { DAI, PETH, WETH } from '../../src/eth/Currency';

let cdpService, cdp, defaultAccount, dai;

beforeAll(async () => {
  cdpService = buildTestEthereumCdpService();
  await cdpService.manager().authenticate();
  defaultAccount = cdpService
    .get('token')
    .get('web3')
    .defaultAccount();
  dai = cdpService.get('token').getToken(DAI);
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

  test('check properties', () => {
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
    expect(cdp._cdpService).toBeDefined();
    expect(cdp._smartContractService).toBeDefined();
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
    wethToken = tokenService.getToken(WETH);
    pethToken = tokenService.getToken(PETH);
  });

  afterAll(async () => {
    await wethToken.approve(cdpService._tubContract().getAddress(), '0');
    await pethToken.approve(cdpService._tubContract().getAddress(), '0');
  });

  test('lock weth in a cdp', async () => {
    await openCdp();
    await wethToken.deposit('0.1');
    const balancePre = await wethToken.balanceOf(defaultAccount);
    const cdpInfoPre = await cdp.getInfo();
    await cdp.lockWeth(0.1);
    const cdpInfoPost = await cdp.getInfo();
    const balancePost = await wethToken.balanceOf(defaultAccount);

    expect(cdpInfoPre.ink.toString()).toEqual('0');
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
    expect(balancePre.minus(0.1)).toEqual(balancePost);
  });

  test('lock peth in a cdp', async () => {
    await openCdp();

    await wethToken.deposit('0.1');
    await wethToken.approve(cdpService._tubContract().getAddress(), '0.1');
    await pethToken.join('0.1');

    const balancePre = await pethToken.balanceOf(defaultAccount);
    const cdpInfoPre = await cdp.getInfo();
    await cdp.lockPeth(0.1);
    const cdpInfoPost = await cdp.getInfo();
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

describe('bite', () => {
  beforeAll(async () => {
    await openCdp();
    await cdp.lockEth(0.1);
    await cdp.drawDai(13);
  });

  afterAll(async () => {
    // other tests expect this to be the case
    await cdpService.get('price').setEthPrice(400);
  });

  // FIXME this breaks other tests, possibly because it leaves the test chain in
  // a broken state
  test.skip('when safe', async () => {
    await expect(cdp.bite()).rejects;
  });

  test('when unsafe', async () => {
    await cdpService.get('price').setEthPrice(0.01);
    const result = await cdp.bite();
    expect(typeof result).toEqual('object');
  });
});

describe('a cdp with collateral', () => {
  beforeAll(async () => {
    await openCdp();
    await cdp.lockEth(0.2);
  });

  test('read ink', async () => {
    const info = await cdp.getInfo();
    expect(info.ink.toString()).toBe('200000000000000000');
  });

  test('read locked collateral in peth', async () => {
    const collateral = await cdp.getCollateralValueInPeth();
    expect(collateral.toString()).toEqual('0.2');
  });

  test('read locked collateral in eth', async () => {
    const collateral = await cdp.getCollateralValueInEth();
    expect(collateral.toString()).toEqual('0.2');
  });

  test('read locked collateral in USD', async () => {
    const collateral = await cdp.getCollateralValueInUSD();
    expect(collateral.toString()).toEqual('80');
  });

  describe('with debt', () => {
    beforeAll(() => cdp.drawDai(5));

    test('read debt in dai', async () => {
      const debt = await cdp.getDebtValueInDai();
      expect(debt.toString()).toEqual('5');
    });

    test('read debt in usd', async () => {
      const debt = await cdp.getDebtValueInUSD();
      expect(debt.toString()).toEqual('5');
    });

    describe('with drip', () => {
      afterAll(() => cdpService.get('price').setMkrPrice(0));

      test('read MKR fee in USD', async done => {
        //block.timestamp is measured in seconds, so we need to wait at least a second for the fees to get updated
        setTimeout(async () => {
          await cdpService._drip(); //drip() updates _rhi and thus all cdp fees
          const fee = await cdp.getMkrFeeInUSD();
          expect(fee).toBeGreaterThan(0);
          done();
        }, 1500);
      });

      test('read MKR fee in MKR', async done => {
        await cdpService.get('price').setMkrPrice(600);
        //block.timestamp is measured in seconds, so we need to wait at least a second for the fees to get updated
        setTimeout(async () => {
          await cdpService._drip(); //drip() updates _rhi and thus all cdp fees
          const fee = await cdp.getMkrFeeInMkr();
          expect(fee).toBeGreaterThan(0);
          done();
        }, 1500);
      });
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
      await cdp.freePeth(0.1);
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
