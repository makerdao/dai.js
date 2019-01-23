import Maker from '@makerdao/dai';
import { mcdMaker } from './helpers';
const { ETH, USD, PETH } = Maker;
import { REP, DGX } from '../src';

let service;

const scenarios = [ETH, REP, DGX].map(c => [c.symbol, c]);

describe.each(scenarios)('%s', (symbol, collateral) => {
  let cdpType;

  beforeAll(async () => {
    const maker = await mcdMaker();
    service = maker.service('cdpType');
    cdpType = service.getCdpType(collateral);
  });

  test('get total collateral', async () => {
    const collateral = await cdpType.getTotalCollateral(collateral);
    expect(collateral).toBe(0);
  });

  test('get total collateral in USD', async () => {
    const collateral = await cdpType.getTotalCollateral(USD);
    expect(collateral).toBe(0);
  });

  test('throw in get total collateral', async () => {
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
    expect(debt).toBe(0);
  });

  test('get debt ceiling', async () => {
    const ceiling = await cdpType.getDebtCeiling();
    expect(ceiling).toBe(0);
  });

  test('get liquidation ratio', async () => {
    const ratio = await cdpType.getLiquidationRatio();
    expect(ratio).toBe(1);
  });

  test('get price', async () => {
    const price = await cdpType.getPrice();
    expect(price).toBe(0);
  });

  test('get liquidation penalty', async () => {
    const penalty = await cdpType.getLiquidationPenalty();
    expect(penalty).toBe(0);
  });

  test('get annual stability fee', async () => {
    const penalty = await cdpType.getAnnualStabilityFee();
    expect(penalty).toBe(0);
  });

  test('get ilk id', async () => {
    const ilkId = await cdpType.ilkId;
    expect(ilkId).toBe(collateral.symbol);
  });
});

test('list all cdp type objects', async () => {
  const allCdpTypes = service.listCdpTypes();
  expect(allCdpTypes).toEqual(['ETH', 'REP', 'DGX']);
});
