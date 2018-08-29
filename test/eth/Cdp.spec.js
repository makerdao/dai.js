import { buildTestEthereumCdpService } from '../helpers/serviceBuilders';
import {
  DAI,
  PETH,
  WETH,
  USD,
  USD_ETH,
  ETH,
  MKR
} from '../../src/eth/Currency';

let cdpService, cdp, currentAccount, dai;

beforeAll(async () => {
  cdpService = buildTestEthereumCdpService();
  await cdpService.manager().authenticate();
  currentAccount = cdpService
    .get('token')
    .get('web3')
    .currentAccount();
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
    await wethToken.approve(cdpService._tubContract().address, '0');
    await pethToken.approve(cdpService._tubContract().address, '0');
  });

  test('lock weth in a cdp', async () => {
    await openCdp();
    await wethToken.deposit('0.1');
    const balancePre = await wethToken.balanceOf(currentAccount);
    const cdpInfoPre = await cdp.getInfo();
    await cdp.lockWeth(0.1);
    const cdpInfoPost = await cdp.getInfo();
    const balancePost = await wethToken.balanceOf(currentAccount);

    expect(cdpInfoPre.ink.toString()).toEqual('0');
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
    expect(balancePre.minus(0.1)).toEqual(balancePost);
  });

  test('lock peth in a cdp', async () => {
    await openCdp();

    await wethToken.deposit('0.1');
    await wethToken.approve(cdpService._tubContract().address, '0.1');
    await pethToken.join('0.1');

    const balancePre = await pethToken.balanceOf(currentAccount);
    const cdpInfoPre = await cdp.getInfo();
    await cdp.lockPeth(0.1);
    const cdpInfoPost = await cdp.getInfo();
    const balancePost = await pethToken.balanceOf(currentAccount);

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
    const collateral = await cdp.getCollateralValue(PETH);
    expect(collateral).toEqual(PETH(0.2));
  });

  test('read locked collateral in eth', async () => {
    const collateral = await cdp.getCollateralValue();
    expect(collateral).toEqual(ETH(0.2));
  });

  test('read locked collateral in USD', async () => {
    const collateral = await cdp.getCollateralValue(USD);
    expect(collateral).toEqual(USD(80));
  });

  test('read collateralization ratio when there is no debt', async () => {
    const ratio = await cdp.getCollateralizationRatio();
    expect(ratio).toEqual(Infinity);
  });

  describe('with debt', () => {
    beforeAll(() => cdp.drawDai(5));

    test('read debt in dai', async () => {
      const debt = await cdp.getDebtValue();
      expect(debt).toEqual(DAI(5));
    });

    test('read debt in usd', async () => {
      const debt = await cdp.getDebtValue(USD);
      expect(debt).toEqual(USD(5));
    });

    describe('with drip', () => {
      afterAll(async () => {
        await cdp.drawDai(1);
        return cdpService.get('price').setMkrPrice(0);
      });

      test('read MKR fee in USD', async done => {
        // block.timestamp is measured in seconds, so we need to wait at least a
        // second for the fees to get updated
        setTimeout(async () => {
          await cdpService._drip(); //drip() updates _rhi and thus all cdp fees
          const fee = await cdp.getGovernanceFee();
          expect(fee.gt(0)).toBeTruthy();
          done();
        }, 1500);
      });

      test('read MKR fee in MKR', async done => {
        await cdpService.get('price').setMkrPrice(600);
        // block.timestamp is measured in seconds, so we need to wait at least a
        // second for the fees to get updated
        setTimeout(async () => {
          await cdpService._drip(); //drip() updates _rhi and thus all cdp fees
          const fee = await cdp.getGovernanceFee();
          expect(fee.gt(0)).toBeTruthy();
          done();
        }, 1500);
      });

      test('wipe debt with non-zero stability fee', async () => {
        const mkr = cdpService.get('token').getToken(MKR);
        const firstDebtAmount = await cdp.getDebtValue();
        const firstMkrBalance = MKR(
          await mkr.balanceOf(currentAccount)
        ).toNumber();
        await cdp.wipeDai(1);
        const secondDebtAmount = await cdp.getDebtValue();
        const secondMkrBalance = MKR(
          await mkr.balanceOf(currentAccount)
        ).toNumber();
        expect(firstDebtAmount.minus(secondDebtAmount)).toEqual(DAI(1));
        expect(firstMkrBalance).toBeGreaterThan(secondMkrBalance);
      });
    });

    test('read liquidation price', async () => {
      const price = await cdp.getLiquidationPrice();
      expect(price).toEqual(USD_ETH(37.5));
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
      const balance1 = parseFloat(await dai.balanceOf(currentAccount));
      await cdp.wipeDai('5');
      const balance2 = parseFloat(await dai.balanceOf(currentAccount));
      expect(balance2 - balance1).toBeCloseTo(-5);
      const debt = await cdp.getDebtValue();
      expect(debt).toEqual(DAI(0));
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
