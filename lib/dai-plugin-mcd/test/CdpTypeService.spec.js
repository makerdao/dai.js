import { createCurrencyRatio } from '@makerdao/currency';
import {
  mcdMaker,
  setupCollateral,
} from './helpers';
import { ServiceRoles } from '../src/constants';
import { ETH, MDAI, MKR, USD, COL1 } from '../src';
const { CDP_MANAGER, CDP_TYPE, QUERY_API } = ServiceRoles;

let maker, service;

// these CDP types should be available to the Maker instance because
// of the configuration passed into it (see test/helpers.js)
const scenarios = [['ETH-A', ETH], ['ETH-B', ETH], ['COL1-A', COL1]];
const systemValues = {
  'ETH-A': {
    expectedCeiling: 1000,
    expectedRatio: 1.5,
    expectedFee: '2.5'
  },
  'ETH-B': {
    expectedCeiling: 500,
    expectedRatio: 1.8,
    expectedFee: '1.5'
  },
  'COL1-A': {
    expectedCeiling: 800,
    expectedRatio: 1.8,
    expectedFee: '2.0'
  }
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
    expect(total).toEqual(GEM(2));
  });

  test('get total collateral in USD', async () => {
    const collateral = await cdpType.getTotalCollateral(USD);
    expect(collateral.toNumber()).toEqual(USD(20).toNumber());
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
    expect(debt).toEqual(MDAI(4));
  });

  test('get debt ceiling', async () => {
    const { expectedCeiling } = systemValues[ilk];
    const ceiling = await cdpType.getDebtCeiling();
    expect(ceiling).toEqual(MDAI(expectedCeiling));
  });

  test('get liquidation ratio', async () => {
    const { expectedRatio } = systemValues[ilk];
    const ratio = await cdpType.getLiquidationRatio();
    expect(ratio.toNumber()).toBe(expectedRatio);
  });

  test('get price', async () => {
    const price = await cdpType.getPrice();
    expect(price.toNumber()).toBe(ratio(10).toNumber());
  });

  test('get liquidation penalty', async () => {
    const penalty = await cdpType.getLiquidationPenalty();
    expect(penalty).toBe(0.05);
  });

  test('get annual stability fee', async () => {
    const { expectedFee } = systemValues[ilk];
    const penalty = await cdpType.getAnnualStabilityFee();
    expect((penalty * 100).toFixed(1)).toBe(expectedFee);
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
