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

let cdpService,
  cdp,
  currentAccount,
  dai,
  dsProxyAddress,
  proxyAccount,
  proxyKey,
  transactionCount;

// this function should be called again after reverting a snapshot; otherwise,
// you may get errors about account and transaction nonces not matching.
async function init(proxy = false) {
  cdpService = buildTestEthereumCdpService();
  await cdpService.manager().authenticate();
  if (proxy) {
    await setProxyAccount();
  } else {
    currentAccount = cdpService
      .get('token')
      .get('web3')
      .currentAccount();
  }
}

async function setProxyAccount(newAccount = false) {
  const accountService = cdpService
    .get('token')
    .get('web3')
    .get('accounts');
  const account = newAccount
    ? {
        address: newAccount.address,
        key: newAccount.key
      }
    : {
        address: proxyAccount,
        key: proxyKey
      };

  await accountService.addAccount(account.address, {
    type: 'privateKey',
    key: account.key
  });
  accountService.useAccount(account.address);
  currentAccount = account.address;
}

async function transferMkr() {
  const mkr = cdpService.get('token').getToken(MKR);
  await mkr.transfer(proxyAccount, MKR(1));
}

function setExistingAccount(name) {
  const accountService = cdpService
    .get('token')
    .get('web3')
    .get('accounts');
  accountService.useAccount(name);
}

beforeAll(async () => {
  await init();
  const account = TestAccountProvider.nextAccount();
  proxyAccount = account.address;
  proxyKey = account.key;
  transferMkr();
  dai = cdpService.get('token').getToken(DAI);
});

const sharedTests = (openCdp, proxy = false) => {
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
      if (proxy) setExistingAccount('default');
      await cdpService.get('price').setEthPrice(400);
      if (proxy) setExistingAccount(proxyAccount);
    });

    // FIXME this breaks other tests, possibly because it leaves the test chain in
    // a broken state
    test.skip('when safe', async () => {
      await expect(cdp.bite()).rejects;
    });

    test('when unsafe', async () => {
      if (proxy) setExistingAccount('default');
      await cdpService.get('price').setEthPrice(0.01);
      if (proxy) setExistingAccount(proxyAccount);
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
          transactionCount = cdpService
            .get('smartContract')
            .get('transactionManager')
            .get('nonce')._counts[currentAccount];
          nonceService = cdpService
            .get('smartContract')
            .get('transactionManager')
            .get('nonce');
        });

        beforeEach(async () => {
          // Restoring the snapshot resets the account here.
          // This causes any following tests that call
          // authenticated functions to fail
          snapshotId = await takeSnapshot();
          await promiseWait(1100);
          await cdpService._drip(); //drip() updates _rhi and thus all cdp fees

          nonceService._counts[currentAccount] = transactionCount;
        });

        afterEach(async () => {
          await restoreSnapshot(snapshotId);
          await init(proxy);
        });

        test('read MKR fee', async () => {
          if (proxy) setExistingAccount('default');
          await cdpService.get('price').setMkrPrice(600);
          if (proxy) setExistingAccount(proxyAccount);
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
          await mkr.transfer(other, await mkr.balanceOf(currentAccount));
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
            mkr.balanceOf(currentAccount)
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
          await mkr.transfer(other, await mkr.balanceOf(currentAccount));
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
            mkr.balanceOf(currentAccount)
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
          // if (!proxy) nonceService._counts[currentAccount] -= 1;
          const mkr = cdpService.get('token').getToken(MKR);
          const debt1 = await cdp.getDebtValue();
          const balance1 = await mkr.balanceOf(currentAccount);
          await cdp.wipeDai(1);
          const debt2 = await cdp.getDebtValue();
          const balance2 = await mkr.balanceOf(currentAccount);
          expect(debt1.minus(debt2)).toEqual(DAI(1));
          expect(balance1.gt(balance2)).toBeTruthy();
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
});

describe('proxy cdp', () => {
  let ethToken;

  beforeAll(async () => {
    ethToken = cdpService.get('token').getToken(ETH);
    await setProxyAccount();
    dsProxyAddress = await cdpService.get('proxy').currentProxy();
  });

  async function openProxyCdp() {
    cdp = await cdpService.openProxyCdp(dsProxyAddress);
    return cdp.id;
  }

  test('use existing DSProxy to open CDP, lock ETH and draw DAI (single tx)', async () => {
    const balancePre = await ethToken.balanceOf(currentAccount);
    const cdp = await cdpService.openProxyCdpLockEthAndDrawDai(
      0.1,
      1,
      dsProxyAddress
    );
    const cdpInfoPost = await cdp.getInfo();
    const balancePost = await ethToken.balanceOf(currentAccount);

    expect(balancePre.minus(balancePost).toNumber()).toBeGreaterThanOrEqual(0.1); // prettier-ignore
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
    expect(cdp.id).toBeGreaterThan(0);
    expect(cdp.dsProxyAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/);
  });

  test('use existing DSProxy to open CDP, then lock ETH and draw DAI (multi tx)', async () => {
    const cdp = await cdpService.openProxyCdp(dsProxyAddress);
    const balancePre = await ethToken.balanceOf(currentAccount);
    const cdpInfoPre = await cdp.getInfo();
    await cdp.lockEthAndDrawDai(0.1, 1);
    const cdpInfoPost = await cdp.getInfo();
    const balancePost = await ethToken.balanceOf(currentAccount);

    // ETH balance should now be reduced by (at least) 0.1 (plus gas)
    expect(balancePre.minus(balancePost).toNumber()).toBeGreaterThanOrEqual(0.1); // prettier-ignore
    expect(cdpInfoPre.ink.toString()).toEqual('0');
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
  });

  sharedTests(openProxyCdp, true);

  test('create DSProxy and open CDP (single tx)', async () => {
    const newAccount = TestAccountProvider.nextAccount();
    await setProxyAccount(newAccount);
    let cdp;
    try {
      cdp = await cdpService.openProxyCdp();
    } catch (err) {
      console.error(err);
    }
    expect(cdp.id).toBeGreaterThan(0);
    expect(cdp.dsProxyAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/);
  });

  test('create DSProxy, open CDP, lock ETH and draw DAI (single tx)', async () => {
    const newAccount = TestAccountProvider.nextAccount();
    await setProxyAccount(newAccount);
    const balancePre = await ethToken.balanceOf(currentAccount);
    const cdp = await cdpService.openProxyCdpLockEthAndDrawDai(0.1, 1);
    const cdpInfoPost = await cdp.getInfo();
    const balancePost = await ethToken.balanceOf(currentAccount);

    expect(balancePre.minus(balancePost).toNumber()).toBeGreaterThanOrEqual(0.1); // prettier-ignore
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
    expect(cdp.id).toBeGreaterThan(0);
    expect(cdp.dsProxyAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/);
  });
});
