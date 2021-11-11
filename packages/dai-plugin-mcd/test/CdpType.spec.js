import { createCurrencyRatio } from '@makerdao/currency';
import { mcdMaker, setupCollateral } from './helpers';
import { ServiceRoles } from '../src/constants';
import { ETH, DAI, USD, BAT } from '../src';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
const { CDP_MANAGER, CDP_TYPE } = ServiceRoles;

let maker, service, snapshotData;

beforeAll(async () => {
  maker = await mcdMaker();
  snapshotData = await takeSnapshot(maker);
  service = maker.service(CDP_TYPE);
  jest.setTimeout(8000);
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

// these CDP types should be available to the Maker instance because
// of the configuration passed into it (see test/helpers.js)
const scenarios = [
  ['ETH-A', ETH],
  ['BAT-A', BAT]
];

/*
  The following arrays are expected values for each tested
  collateral type. The defined values are:
  [total collateral, total debt, debt ceiling, liquidation ratio,
  liquidation penalty, annual stability fee]
*/
const systemValues = {
  'ETH-A': [80, 200, 1000000, 1.5, 0.05, '5.0'],
  // 'ETH-B': [2, 4, 100000, 2, 0.05, '4.0'],
  'BAT-A': [80, 200, 1000000, 2, 0.08, '10.5']
};

describe.each(scenarios)('%s', (ilk, GEM) => {
  //TODO probably could reduce this, but 5000 was seemingly too short
  jest.setTimeout(30000);
  const price = 10;
  let cdpType, ratio;

  beforeAll(async () => {
    ratio = createCurrencyRatio(USD, GEM);
    await setupCollateral(maker, ilk, { price });

    for (let i = 0; i < 2; i++) {
      await maker.service(CDP_MANAGER).openLockAndDraw(ilk, GEM(40), 100);
    }

    cdpType = service.getCdpType(GEM, ilk);
    cdpType.reset();
    await cdpType.prefetch();
  });

  test('get total collateral', () => {
    expect(cdpType.totalCollateral).toEqual(GEM(systemValues[ilk][0]));
    expect(cdpType.totalCollateral.times(cdpType.price).toNumber()).toEqual(
      USD(systemValues[ilk][0] * price).toNumber()
    );
  });

  test('get total debt', () => {
    expect(cdpType.totalDebt.toNumber()).toBeCloseTo(systemValues[ilk][1]);
  });

  test('get debt ceiling', () => {
    expect(cdpType.debtCeiling).toEqual(DAI(systemValues[ilk][2]));
  });

  test('get liquidation ratio', () => {
    expect(cdpType.liquidationRatio.toNumber()).toBe(systemValues[ilk][3]);
  });

  test('get price', () => {
    expect(cdpType.price.toNumber()).toBe(ratio(price).toNumber());
  });

  test('get liquidation penalty', async () => {
    expect(cdpType.liquidationPenalty).toBe(systemValues[ilk][4]);
  });

  test('get annual stability fee', async () => {
    expect((cdpType.annualStabilityFee * 100).toFixed(1)).toBe(
      systemValues[ilk][5]
    );
  });

  test('get ilk id', () => {
    expect(cdpType.ilk).toBe(ilk);
  });
});

test('get system-wide debt', () => {
  expect(service.totalDebtAllCdpTypes.toNumber()).toBeCloseTo(400);
});

test('get system-wide collateral value', () => {
  expect(service.totalCollateralValueAllCdpTypes.toNumber()).toBeCloseTo(1600);
});

test('get system-wide collateralization ratio', async () => {
  expect(service.totalCollateralizationRatioAllCdpTypes.toNumber()).toBeCloseTo(
    4
  );
});
