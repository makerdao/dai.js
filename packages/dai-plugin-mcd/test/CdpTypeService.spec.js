import { createCurrencyRatio } from '@makerdao/currency';
import { mcdMaker, setupCollateral } from './helpers';
import { ServiceRoles } from '../src/constants';
import { ETH, MDAI, MKR, USD, REP } from '../src';
const { CDP_MANAGER, CDP_TYPE, QUERY_API } = ServiceRoles;

let maker, service;

// these CDP types should be available to the Maker instance because
// of the configuration passed into it (see test/helpers.js)
const scenarios = [['ETH-A', ETH], ['ETH-B', ETH], ['REP-A', REP]];

/*
  The following arrays are expected values for each tested
  collateral type. The defined values are:
  [total collateral, total debt, debt ceiling, liquidation ratio,
  liquidation penalty, annual stability fee]
*/
const systemValues = {
  'ETH-A': [2, 4, 100000, 1.5, 0.05, '5.0'],
  'ETH-B': [2, 4, 100000, 2, 0.05, '4.0'],
  'REP-A': [2, 4, 5000, 1.8, 0.08, '10.0']
};

beforeAll(async () => {
  maker = await mcdMaker();
  jest.setTimeout(8000);
});

test('getCdpType with no matches throws an error', () => {
  service = maker.service(CDP_TYPE);
  expect(() => {
    service.getCdpType('FOO');
  }).toThrowError(/matches no cdp type/);
});

test('getCdpType with too many matches throws an error', () => {
  service = maker.service(CDP_TYPE);
  expect(() => {
    service.getCdpType(ETH);
  }).toThrowError(/matches more than one cdp type/);
});

describe.each(scenarios)('%s', (ilk, GEM) => {
  let cdpType, ratio;

  beforeAll(async () => {
    service = maker.service(CDP_TYPE);
    cdpType = service.getCdpType(GEM, ilk);
    cdpType.reset();
    ratio = createCurrencyRatio(USD, GEM);

    await setupCollateral(maker, ilk, { price: 10, debtCeiling: 111 });

    for (let i = 0; i < 2; i++) {
      await maker.service(CDP_MANAGER).openLockAndDraw(ilk, GEM(1), 2);
    }
  });

  test('get total collateral', async () => {
    const total = await cdpType.getTotalCollateral();
    expect(total).toEqual(GEM(systemValues[ilk][0]));
  });

  test('get total collateral in USD', async () => {
    const collateral = await cdpType.getTotalCollateral(USD);
    expect(collateral.toNumber()).toEqual(
      USD(systemValues[ilk][0] * 10).toNumber()
    );
  });

  test('throw error for invalid collateral type', async () => {
    expect.assertions(1);
    try {
      await cdpType.getTotalCollateral(MKR);
    } catch (err) {
      expect(err.message).toMatch(
        /Don't know how to get total collateral in MKR/
      );
    }
  });

  test('get total debt', async () => {
    const debt = await cdpType.getTotalDebt();
    expect(debt.toNumber()).toBeCloseTo(systemValues[ilk][1]);
  });

  test('get debt ceiling', async () => {
    const ceiling = await cdpType.getDebtCeiling();
    expect(ceiling).toEqual(MDAI(systemValues[ilk][2]));
  });

  test('get liquidation ratio', async () => {
    const ratio = await cdpType.getLiquidationRatio();
    expect(ratio.toNumber()).toBe(systemValues[ilk][3]);
  });

  test('get price', async () => {
    const price = await cdpType.getPrice();
    expect(price.toNumber()).toBe(ratio(10).toNumber());
  });

  test('get liquidation penalty', async () => {
    const penalty = await cdpType.getLiquidationPenalty();
    expect(penalty).toBe(systemValues[ilk][4]);
  });

  test('get annual stability fee', async () => {
    const penalty = await cdpType.getAnnualStabilityFee();
    expect((penalty * 100).toFixed(1)).toBe(systemValues[ilk][5]);
  });

  test('get price history', async () => {
    const dummyData = [
      {
        val: '177315000000000000000',
        blockNumber: '1'
      }
    ];
    const formattedDummyData = [
      {
        price: GEM(177.315),
        time: new Date(
          1000 * (await cdpType._web3Service.getBlock(1)).timestamp
        )
      }
    ];
    const mockFn = jest.fn(async () => dummyData);
    maker.service(QUERY_API).getPriceHistoryForPip = mockFn;
    const prices = await cdpType.getPriceHistory();
    expect(mockFn).toBeCalled();
    expect(prices).toEqual(formattedDummyData);
  });

  test('get ilk id', () => {
    expect(cdpType.ilk).toBe(ilk);
  });
});
