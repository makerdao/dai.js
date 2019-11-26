import { buildTestEthereumCdpService } from '../helpers/serviceBuilders';
import { USD_DAI } from '../../src/eth/Currency';
import Cdp from '../../src/eth/Cdp';
import { mineBlocks } from '@makerdao/test-helpers';
import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';

let cdpService;

beforeAll(async () => {
  cdpService = buildTestEthereumCdpService();
  await cdpService.manager().authenticate();
});

afterAll(async () => {
  // other tests expect this to be the case
  await cdpService.get('price').setEthPrice('400');
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
  expect(tp).toEqual(USD_DAI(1));
});

describe('find cdp', () => {
  let cdp, proxyCdp, proxyAddress;

  beforeAll(async () => {
    cdp = await cdpService.openCdp();
    proxyAddress = (await cdpService.get('proxy').currentProxy()).toLowerCase();
    proxyCdp = await cdpService.openProxyCdp(proxyAddress);
  });

  test('returns a normal cdp', async () => {
    const sameCdp = await cdpService.getCdp(cdp.id);
    expect(sameCdp.id).toEqual(cdp.id);
    expect(sameCdp.dsProxyAddress).not.toBeDefined();
  });

  test('regression: handle null proxy correctly', async () => {
    const cdps = buildTestEthereumCdpService({
      accounts: {
        default: { type: 'privateKey', ...TestAccountProvider.nextAccount() }
      }
    });
    await cdps.manager().authenticate();
    const sameCdp = await cdps.getCdp(cdp.id);
    expect(sameCdp.id).toEqual(cdp.id);
    expect(sameCdp.dsProxyAddress).not.toBeDefined();
  });

  test('prevents returning a normal cdp as a proxy cdp', async () => {
    expect.assertions(1);
    return cdpService.getCdp(cdp.id, proxyAddress).catch(err => {
      expect(err.message).toMatch(/not owned by that address/);
    });
  });

  test('returns a proxy cdp with proxy address argument', async () => {
    const sameCdp = await cdpService.getCdp(proxyCdp.id, proxyAddress);
    expect(sameCdp.dsProxyAddress).toEqual(proxyAddress);
  });

  test('returns a proxy cdp without proxy address argument', async () => {
    const sameCdp = await cdpService.getCdp(proxyCdp.id);
    expect(sameCdp.dsProxyAddress).toEqual(proxyAddress);
  });

  test('prevents returning a proxy cdp with non-matching owner', async () => {
    expect.assertions(1);
    const badAddress = '0x0000000000000000000000000000000000000001';
    return cdpService.getCdp(cdp.id, badAddress).catch(err => {
      expect(err.message).toMatch(/not owned by that address/);
    });
  });

  test('throws on invalid id', async () => {
    expect.assertions(1);
    try {
      await cdpService.getCdp('a');
    } catch (err) {
      expect(err.message).toBe('ID must be a number.');
    }
  });
});

test('can calculate system collateralization', async () => {
  const cdp = await cdpService.openCdp();
  let lock = cdp.lockEth(0.1);
  await Promise.all([lock, mineBlocks(cdpService)]);
  await cdp.drawDai(1);
  const scA = await cdpService.getSystemCollateralization();

  lock = cdp.lockEth(0.1);
  await Promise.all([lock, mineBlocks(cdpService)]);
  const scB = await cdpService.getSystemCollateralization();
  expect(scB).toBeGreaterThan(scA);

  await cdp.drawDai(1);
  const scC = await cdpService.getSystemCollateralization();
  expect(scC).toBeLessThan(scB);
}, 10000);

test('openCdp returns the transaction object', async () => {
  const txo = cdpService.openCdp();
  expect(txo).toBeInstanceOf(Promise);
  const cdp = await txo;
  expect(cdp).toBeInstanceOf(Cdp);
});
