import { createCurrencyRatio } from '@makerdao/currency';
import { mcdMaker, setupCollateral } from './helpers';
import { ServiceRoles } from '../src/constants';
import { ETH, MDAI, MKR, USD, REP } from '../src';
const { CDP_MANAGER, CDP_TYPE, QUERY_API } = ServiceRoles;

let maker, service;

// these CDP types should be available to the Maker instance because
// of the configuration passed into it (see test/helpers.js)
const scenarios = [['ETH-A', ETH], ['ETH-B', ETH], ['REP-A', REP]];
let systemValues = {};

function setSystemValues() {
  const values = [[12.7, 100000, 1.5, '5.0', '21.5', 0.05], [4, 100000, 2, '4.0', '8', 0.05], [6.7, 5000, 1.8, '10.0', '13.5', 0.08]];
  let scenario;
  for (scenario = 0; scenario < scenarios.length; scenario++) {
    systemValues[scenarios[scenario][0]] = {
      expectedTotalCollateral: values[scenario][0],
      expectedCeiling: values[scenario][1],
      expectedRatio: values[scenario][2],
      expectedFee: values[scenario][3],
      expectedTotalDebt: values[scenario][4],
      expectedPenalty: values[scenario][5]
    };
  }
}

beforeAll(async () => {
  maker = await mcdMaker();
  setSystemValues();
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
    const { expectedTotalCollateral } = systemValues[ilk];
    const total = await cdpType.getTotalCollateral();
    expect(total).toEqual(GEM(expectedTotalCollateral));
  });
  
  test('get total collateral in USD', async () => {
    const { expectedTotalCollateral } = systemValues[ilk];
    const collateral = await cdpType.getTotalCollateral(USD);
    expect(collateral.toNumber()).toEqual(USD(expectedTotalCollateral * 10).toNumber());
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
    const { expectedTotalDebt } = systemValues[ilk];
    const debt = await cdpType.getTotalDebt();
    expect(debt).toEqual(MDAI(expectedTotalDebt));
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
    const { expectedPenalty } = systemValues[ilk];
    const penalty = await cdpType.getLiquidationPenalty();
    expect(penalty).toBe(expectedPenalty);
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
