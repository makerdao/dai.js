import { SAI, PETH, USD, USD_ETH, ETH, MKR } from '../src/Currency';
import {
  mineBlocks,
  takeSnapshot,
  restoreSnapshot
} from '@makerdao/test-helpers';
import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';
import { promiseWait } from '../src/utils';
import { scdMaker } from './helpers/maker';
import { ServiceRoles } from '../src/utils/constants';

let priceService, currentAddress;

async function setPrice(type, amount) {
  if (!priceService) {
    const maker = await scdMaker();
    priceService = maker.service(ServiceRoles.PRICE);
  }
  const method = type === MKR ? 'setMkrPrice' : 'setEthPrice';
  await priceService[method](amount);
}

export default function sharedTests(openCdp, initCdpService) {
  let cdp, cdpService, sai;

  beforeAll(async () => {
    cdpService = await initCdpService();
    currentAddress = cdpService
      .get('token')
      .get('web3')
      .currentAddress();
    sai = cdpService.get('token').getToken(SAI);
  });

  describe('basic checks', () => {
    let cdp;

    beforeAll(async () => {
      cdp = await openCdp(cdpService);
    });

    test('check properties', () => {
      const { id } = cdp;
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
      expect(cdp._cdpService).toBeDefined();
      expect(cdp._smartContractService).toBeDefined();
    });

    test('lookup by ID', async () => {
      expect.assertions(2);
      const info = await cdpService.getInfo(cdp.id);
      expect(info).toBeTruthy();
      expect(info.lad).toMatch(/^0x[A-Fa-f0-9]{40}$/);
    });

    test('read liquidation price with 0 collateral', async () => {
      const price = await cdp.getLiquidationPrice();
      expect(price).toEqual(USD_ETH(Infinity));
    });

    test('shut', async () => {
      await cdp.shut();
      const info = await cdp.getInfo();
      expect(info.lad).toBe('0x0000000000000000000000000000000000000000');
    });
  });

  test('transfer ownership', async () => {
    const newAddress = '0x046Ce6b8eCb159645d3A605051EE37BA93B6efCc';
    cdp = await openCdp(cdpService);
    const info = await cdp.getInfo();
    await cdp.give(newAddress);
    const info2 = await cdp.getInfo();
    expect(info2.lad).not.toEqual(info.lad);
    expect(info2.lad).toEqual(newAddress);
  });

  describe('bite', () => {
    beforeAll(async () => {
      cdp = await openCdp(cdpService);
      const tx = cdp.lockEth(0.1);
      mineBlocks(cdpService);
      await tx;
      await cdp.drawSai(13);
    });

    afterAll(async () => {
      // other tests expect this to be the case
      await setPrice(ETH, 400);
    });

    // FIXME this breaks other tests, possibly because it leaves the test chain
    // in a broken state
    test.skip('when safe', async () => {
      await expect(cdp.bite()).rejects;
    });

    // FIXME test something meaningful
    test('when unsafe', async () => {
      await setPrice(ETH, 0.01);
      const result = await cdp.bite();
      expect(typeof result).toEqual('object');
    });
  });

  describe('a cdp with collateral', () => {
    beforeAll(async () => {
      cdp = await openCdp(cdpService);
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
      beforeAll(() => cdp.drawSai(5));

      test('read debt in sai', async () => {
        const debt = await cdp.getDebtValue();
        expect(debt).toEqual(SAI(5));
      });

      test('read debt in usd', async () => {
        const debt = await cdp.getDebtValue(USD);
        expect(debt).toEqual(USD(5));
      });

      describe('with drip', () => {
        let snapshotData, nonceService, transactionCount;

        beforeAll(async () => {
          nonceService = cdpService
            .get('smartContract')
            .get('transactionManager')
            .get('nonce');
          transactionCount = nonceService._counts[currentAddress];

          // wait at least a second for the fees to get updated
          await promiseWait(1100);
        });

        beforeEach(async () => {
          // Restoring the snapshot resets the account here. This causes any
          // following tests that call authenticated functions to fail
          snapshotData = await takeSnapshot();
          await cdpService._drip(); //drip() updates _rhi and thus all cdp fees
          nonceService._counts[currentAddress] = transactionCount;
        });

        afterEach(async () => {
          await restoreSnapshot(snapshotData);
          cdpService = await initCdpService();
        });

        test('read MKR fee', async () => {
          await setPrice(MKR, 600);
          const usdFee = await cdp.getGovernanceFee(USD);
          expect(usdFee.gt(0)).toBeTruthy();
          const mkrFee = await cdp.getGovernanceFee();
          expect(mkrFee.toNumber()).toBeLessThan(usdFee.toNumber());
        });

        test('fail to wipe debt due to insufficient MKR', async () => {
          expect.assertions(3);
          const amountToWipe = SAI(1);
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
            await cdp.wipeSai(1);
          } catch (err) {
            expect(err).toBeTruthy();
            expect(err.message).toBe(
              'not enough MKR balance to cover governance fee'
            );
          }
        });

        test('fail to shut due to insufficient MKR', async () => {
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
          await cdp.wipeSai(1);
          const debt2 = await cdp.getDebtValue();
          const balance2 = await mkr.balanceOf(currentAddress);
          expect(debt1.minus(debt2)).toEqual(SAI(1));
          expect(balance1.gt(balance2)).toBeTruthy();
        });

        test('wipe', async () => {
          const balance1 = parseFloat(await sai.balanceOf(currentAddress));
          await cdp.wipeSai('5');
          const balance2 = parseFloat(await sai.balanceOf(currentAddress));
          expect(balance2 - balance1).toBeCloseTo(-5);
          const debt = await cdp.getDebtValue();
          expect(debt).toEqual(SAI(0));
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
}
