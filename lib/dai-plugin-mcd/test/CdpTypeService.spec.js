import Maker from '@makerdao/dai';
import {
  mcdMaker,
  setupCollateral,
  setDebtCeiling,
  setLiquidationPenalty,
  setAnnualStabilityFee
} from './helpers';
import { ServiceRoles } from '../src/constants';
import { MDAI, REP, DGX } from '../src';
import { RAY } from '@makerdao/dai/utils/constants';
import BigNumber from 'bignumber.js';
const { createCurrencyRatio, ETH, USD, PETH } = Maker;
const { CDP_MANAGER, CDP_TYPE } = ServiceRoles;

let maker, service;

const scenarios = [ETH, REP, DGX].map(c => [c.symbol, c]);

beforeAll(async () => {
  maker = await mcdMaker();
  await setDebtCeiling(maker, MDAI(100));
});

describe.each(scenarios)('%s', (symbol, GEM) => {
  let cdpType, ratio;

  beforeAll(async () => {
    service = maker.service(CDP_TYPE);
    cdpType = service.getCdpType(GEM);

    await setupCollateral(maker, GEM, {
      price: 10,
      debtCeiling: 111,
      mint: 5 // mint is ignored for ETH
    });

    ratio = createCurrencyRatio(USD, GEM);
    for (let i = 0; i < 2; i++) {
      await maker.service(CDP_MANAGER).openLockAndDraw(GEM(1), 2);
    }
  });

  test('get total collateral', async () => {
    const total = await cdpType.getTotalCollateral();
    expect(total).toEqual(GEM(2));
  });

  test('get total collateral in USD', async () => {
    const collateral = await cdpType.getTotalCollateral(USD);
    expect(collateral).toEqual(USD(20));
  });

  test('throw error for invalid collateral type', async () => {
    expect.assertions(1);
    try {
      await cdpType.getTotalCollateral(PETH);
    } catch (err) {
      expect(err.message).toMatch(
        /Don't know how to get total collateral in PETH/
      );
    }
  });

  test('get total debt', async () => {
    const debt = await cdpType.getTotalDebt();
    expect(debt).toEqual(MDAI(4));
  });

  test('get debt ceiling', async () => {
    const ceiling = await cdpType.getDebtCeiling();
    expect(ceiling).toEqual(MDAI(111));
  });

  test('get liquidation ratio', async () => {
    const ratio = await cdpType.getLiquidationRatio();
    expect(ratio).toBe(1);
  });

  test('get price', async () => {
    const price = await cdpType.getPrice();
    expect(price).toEqual(ratio(10));
  });

  test('get liquidation penalty', async () => {
    const amount = BigNumber(1.13).multipliedBy(RAY);
    await setLiquidationPenalty(maker, amount, GEM);
    const penalty = await cdpType.getLiquidationPenalty();
    expect(penalty).toBe(0.13);
  });

  test('get annual stability fee', async () => {
    const amount = BigNumber(1.000000000472114805215157978).multipliedBy(RAY);
    await setAnnualStabilityFee(maker, amount, GEM);
    const penalty = await cdpType.getAnnualStabilityFee();
    expect((penalty*100).toFixed(1)).toBe('1.5');
  });

  test('get ilk id', () => {
    expect(cdpType.ilkId).toBe(GEM.symbol);
  });
});

test('list all cdp type objects', async () => {
  const allCdpTypes = service.listCdpTypes();
  expect(allCdpTypes).toEqual(['ETH', 'REP', 'DGX']);
});
