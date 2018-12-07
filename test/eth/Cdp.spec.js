import { buildTestEthereumCdpService } from '../helpers/serviceBuilders';
import { takeSnapshot, restoreSnapshot } from '../helpers/ganache';
import TestAccountProvider from '../helpers/TestAccountProvider';
import {
  DAI,
  PETH,
  WETH,
  USD,
  USD_ETH,
  ETH,
  MKR
} from '../../src/eth/Currency';
import { promiseWait } from '../../src/utils';
import { mineBlocks } from '../helpers/transactionConfirmation';
import {
  setProxyAccount,
  transferMkr,
  setExistingAccount
} from '../helpers/proxyHelpers';

let cdpService,
  cdp,
  currentAddress,
  dai,
  dsProxyAddress,
  proxyAccount,
  transactionCount;

// this function should be called again after reverting a snapshot; otherwise,
// you may get errors about account and transaction nonces not matching.
async function init(useProxy = false) {
  cdpService = buildTestEthereumCdpService();
  await cdpService.manager().authenticate();
  if (useProxy) {
    await setProxyAccount(cdpService, proxyAccount);
    currentAddress = proxyAccount.address;
  } else {
    currentAddress = cdpService
      .get('token')
      .get('web3')
      .currentAccount();
  }
}

beforeAll(async () => {
  await init();
  const account = TestAccountProvider.nextAccount();
  proxyAccount = { address: account.address, key: account.key };
  transferMkr(cdpService, proxyAccount.address);
  dai = cdpService.get('token').getToken(DAI);
});

const sharedTests = (openCdp, useProxy = false) => {
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
      await cdp.shut();
      const info = await cdp.getInfo();
      expect(info.lad).toBe('0x0000000000000000000000000000000000000000');
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

  test('read liquidation price with 0 collateral', async () => {
    const price = await cdp.getLiquidationPrice();
    expect(price).toEqual(USD_ETH(Infinity));
  });

  describe('bite', () => {
    beforeAll(async () => {
      await openCdp();
      const tx = cdp.lockEth(0.1);
      mineBlocks(cdpService);
      await tx;
      await cdp.drawDai(13);
    });

    afterAll(async () => {
      // other tests expect this to be the case
      if (useProxy) setExistingAccount(cdpService, 'default');
      await cdpService.get('price').setEthPrice(400);
      if (useProxy) setExistingAccount(cdpService, proxyAccount.address);
    });

    // FIXME this breaks other tests, possibly because it leaves the test chain in
    // a broken state
    test.skip('when safe', async () => {
      await expect(cdp.bite()).rejects;
    });

    test('when unsafe', async () => {
      if (useProxy) setExistingAccount(cdpService, 'default');
      await cdpService.get('price').setEthPrice(0.01);
      if (useProxy) setExistingAccount(cdpService, proxyAccount.address);
      const result = await cdp.bite();
      expect(typeof result).toEqual('object');
    });
  });

  describe('a cdp with collateral', () => {
    beforeAll(async () => {
      await openCdp();
      const tx = cdp.lockEth(0.2);
      mineBlocks(cdpService);
      await tx;
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

    test('read collateralization ratio with no debt', async () => {
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
        let snapshotId, nonceService;

        beforeAll(() => {
          nonceService = cdpService
            .get('smartContract')
            .get('transactionManager')
            .get('nonce');
          transactionCount = nonceService._counts[currentAddress];
        });

        beforeEach(async () => {
          // Restoring the snapshot resets the account here.
          // This causes any following tests that call
          // authenticated functions to fail
          snapshotId = await takeSnapshot();
          await promiseWait(1100);
          await cdpService._drip(); //drip() updates _rhi and thus all cdp fees

          nonceService._counts[currentAddress] = transactionCount;
        });

        afterEach(async () => {
          await restoreSnapshot(snapshotId);
          await init(useProxy);
        });

        test('read MKR fee', async () => {
          if (useProxy) setExistingAccount(cdpService, 'default');
          await cdpService.get('price').setMkrPrice(600);
          if (useProxy) setExistingAccount(cdpService, proxyAccount.address);
          // block.timestamp is measured in seconds, so we need to wait at least a
          // second for the fees to get updated
          const usdFee = await cdp.getGovernanceFee(USD);
          expect(usdFee.gt(0)).toBeTruthy();
          const mkrFee = await cdp.getGovernanceFee();
          expect(mkrFee.toNumber()).toBeLessThan(usdFee.toNumber());
        });

        test('fail to wipe debt due to lack of MKR', async () => {
          expect.assertions(2);
          const mkr = cdpService.get('token').getToken(MKR);
          const other = TestAccountProvider.nextAddress();
          await mkr.transfer(other, await mkr.balanceOf(currentAddress));
          try {
            await cdp.wipeDai(1);
          } catch (err) {
            expect(err).toBeTruthy();
            expect(err.message).toBe(
              'not enough MKR balance to cover governance fee'
            );
          }
        });

        test('fail to wipe debt due to lack of MKR, despite having MKR', async () => {
          expect.assertions(3);
          const amountToWipe = DAI(1);
          const mkr = cdpService.get('token').getToken(MKR);
          const [fee, debt, balance] = await Promise.all([
            cdp.getGovernanceFee(MKR),
            cdp.getDebtValue(),
            mkr.balanceOf(currentAddress)
          ]);
          const mkrOwed = amountToWipe
            .div(debt)
            .toBigNumber()
            .times(fee.toBigNumber());
          const mkrToSendAway = balance.minus(mkrOwed.times(0.99)); //keep 99% of MKR needed
          const other = TestAccountProvider.nextAddress();
          await mkr.transfer(other, mkrToSendAway);
          const enoughMkrToWipe = await cdp.enoughMkrToWipe(1);
          expect(enoughMkrToWipe).toBe(false);
          try {
            await cdp.wipeDai(1);
          } catch (err) {
            expect(err).toBeTruthy();
            expect(err.message).toBe(
              'not enough MKR balance to cover governance fee'
            );
          }
        });

        test('fail to shut due to lack of MKR', async () => {
          expect.assertions(2);
          const mkr = cdpService.get('token').getToken(MKR);
          const other = TestAccountProvider.nextAddress();
          await mkr.transfer(other, await mkr.balanceOf(currentAddress));
          try {
            await cdp.shut();
          } catch (err) {
            expect(err).toBeTruthy();
            expect(err.message).toBe(
              'not enough MKR balance to cover governance fee'
            );
          }
        });

        test('fail to shut due to lack of MKR, despite having MKR', async () => {
          expect.assertions(3);
          const mkr = cdpService.get('token').getToken(MKR);
          const [fee, debt, balance] = await Promise.all([
            cdp.getGovernanceFee(MKR),
            cdp.getDebtValue(),
            mkr.balanceOf(currentAddress)
          ]);
          const mkrToSendAway = balance.minus(fee.times(0.99)); //keep 99% of MKR needed
          const other = TestAccountProvider.nextAddress();
          await mkr.transfer(other, mkrToSendAway);
          const enoughMkrToWipe = await cdp.enoughMkrToWipe(debt);
          expect(enoughMkrToWipe).toBe(false);
          try {
            await cdp.shut();
          } catch (err) {
            expect(err).toBeTruthy();
            expect(err.message).toBe(
              'not enough MKR balance to cover governance fee'
            );
          }
        });

        test('wipe debt with non-zero stability fee', async () => {
          const mkr = cdpService.get('token').getToken(MKR);
          const debt1 = await cdp.getDebtValue();
          const balance1 = await mkr.balanceOf(currentAddress);
          await cdp.wipeDai(1);
          const debt2 = await cdp.getDebtValue();
          const balance2 = await mkr.balanceOf(currentAddress);
          expect(debt1.minus(debt2)).toEqual(DAI(1));
          expect(balance1.gt(balance2)).toBeTruthy();
        });

        test('wipe', async () => {
          const balance1 = parseFloat(await dai.balanceOf(currentAddress));
          await cdp.wipeDai('5');
          const balance2 = parseFloat(await dai.balanceOf(currentAddress));
          expect(balance2 - balance1).toBeCloseTo(-5);
          const debt = await cdp.getDebtValue();
          expect(debt).toEqual(DAI(0));
        });

        test('free', async () => {
          await cdp.freeEth(0.1);
          const info = await cdp.getInfo();
          expect(info.ink.toString()).toEqual('100000000000000000');
        });

        test('shut', async () => {
          await cdp.shut();
          const info = await cdp.getInfo();
          expect(info.lad).toBe('0x0000000000000000000000000000000000000000');
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
    });
  });
};

describe('non-proxy cdp', () => {
  async function openNonProxyCdp() {
    cdp = await cdpService.openCdp();
    return cdp.id;
  }

  sharedTests(openNonProxyCdp);

  describe('weth and peth', () => {
    let wethToken, pethToken;

    beforeAll(() => {
      const tokenService = cdpService.get('token');
      wethToken = tokenService.getToken(WETH);
      pethToken = tokenService.getToken(PETH);
    });

    beforeEach(async () => {
      await openNonProxyCdp();
      await wethToken.deposit(0.1);
    });

    afterAll(async () => {
      await wethToken.approve(cdpService._tubContract().address, '0');
      await pethToken.approve(cdpService._tubContract().address, '0');
    });

    test('lock weth in a cdp', async () => {
      const balancePre = await wethToken.balanceOf(currentAddress);
      const cdpInfoPre = await cdp.getInfo();
      await cdp.lockWeth(0.1);
      const cdpInfoPost = await cdp.getInfo();
      const balancePost = await wethToken.balanceOf(currentAddress);

      expect(cdpInfoPre.ink.toString()).toEqual('0');
      expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
      expect(balancePre.minus(0.1)).toEqual(balancePost);
    });

    test('lock peth in a cdp', async () => {
      await wethToken.approve(cdpService._tubContract().address, '0.1');
      await pethToken.join('0.1');

      const balancePre = await pethToken.balanceOf(currentAddress);
      const cdpInfoPre = await cdp.getInfo();
      await cdp.lockPeth(0.1);
      const cdpInfoPost = await cdp.getInfo();
      const balancePost = await pethToken.balanceOf(currentAddress);

      expect(cdpInfoPre.ink.toString()).toEqual('0');
      expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
      expect(balancePre.minus(0.1)).toEqual(balancePost);
    });
  });
});

describe('proxy cdp', () => {
  let ethToken;

  beforeAll(async () => {
    ethToken = cdpService.get('token').getToken(ETH);
    await setProxyAccount(cdpService, proxyAccount);
    currentAddress = proxyAccount.address;
    await setProxy();
  });

  async function getProxy() {
    return await cdpService.get('proxy').currentProxy();
  }

  async function setProxy() {
    if (!(await getProxy())) await cdpService.get('proxy').build();
    dsProxyAddress = await getProxy();
  }

  async function openProxyCdp() {
    cdp = await cdpService.openProxyCdp(dsProxyAddress);
    return cdp.id;
  }

  test('use existing DSProxy to open CDP, lock ETH and draw DAI (single tx)', async () => {
    const balancePre = await ethToken.balanceOf(currentAddress);
    const cdp = await cdpService.openProxyCdpLockEthAndDrawDai(
      0.1,
      1,
      dsProxyAddress
    );
    const cdpInfoPost = await cdp.getInfo();
    const balancePost = await ethToken.balanceOf(currentAddress);

    expect(balancePre.minus(balancePost).toNumber()).toBeGreaterThanOrEqual(0.1); // prettier-ignore
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
    expect(cdp.id).toBeGreaterThan(0);
    expect(cdp.dsProxyAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/);
  });

  test('use existing DSProxy to open CDP, then lock ETH and draw DAI (multi tx)', async () => {
    const cdp = await cdpService.openProxyCdp(dsProxyAddress);
    const balancePre = await ethToken.balanceOf(currentAddress);
    const cdpInfoPre = await cdp.getInfo();
    await cdp.lockEthAndDrawDai(0.1, 1);
    const cdpInfoPost = await cdp.getInfo();
    const balancePost = await ethToken.balanceOf(currentAddress);

    // ETH balance should now be reduced by (at least) 0.1 (plus gas)
    expect(balancePre.minus(balancePost).toNumber()).toBeGreaterThanOrEqual(0.1); // prettier-ignore
    expect(cdpInfoPre.ink.toString()).toEqual('0');
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
  });

  sharedTests(openProxyCdp, true);

  test('create DSProxy and open CDP (single tx)', async () => {
    const newAccount = TestAccountProvider.nextAccount();
    await setProxyAccount(cdpService, newAccount);
    currentAddress = newAccount.address;
    const cdp = await cdpService.openProxyCdp();
    expect(cdp.id).toBeGreaterThan(0);
    expect(cdp.dsProxyAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/);
  });

  test('create DSProxy, open CDP, lock ETH and draw DAI (single tx)', async () => {
    const newAccount = TestAccountProvider.nextAccount();
    await setProxyAccount(cdpService, newAccount);
    currentAddress = newAccount.address;
    const balancePre = await ethToken.balanceOf(currentAddress);
    const cdp = await cdpService.openProxyCdpLockEthAndDrawDai(0.1, 1);
    const cdpInfoPost = await cdp.getInfo();
    const balancePost = await ethToken.balanceOf(currentAddress);

    expect(balancePre.minus(balancePost).toNumber()).toBeGreaterThanOrEqual(0.1); // prettier-ignore
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
    expect(cdp.id).toBeGreaterThan(0);
    expect(cdp.dsProxyAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/);
  });
});
