import { mcdMaker } from './helpers';
import { ServiceRoles } from '../src/constants';

const scenarios = [['ETH-A'], ['DAI'], ['MKR']];

/*
  The following arrays are expected values for each tested
  collateral type. The defined values are:
  [max bid lifetime, min bid increase]
*/
const systemData = {
  'ETH-A': [1, 0.03, 0.04],
  DAI: [3, 0.05, 2],
  MKR: [3, 0.05, 2]
};

describe.each(scenarios)('%s', ilk => {
  let auction;

  beforeAll(async () => {
    const maker = await mcdMaker();
    const service = maker.service(ServiceRoles.AUCTION);
    auction = service.getAuction(ilk);
  });

  test('get max bid lifetime', async () => {
    const time = await auction.getMaxBidLifetime();
    expect(time).toBe(systemData[ilk][0]);
  });

  test('get min bid increase', async () => {
    const time = await auction.getMinBidIncrease();
    expect(time).toBe(systemData[ilk][1]);
  });

  test('get max auction duration', async () => {
    const time = await auction.getMaxAuctionDuration();
    expect(time).toBeCloseTo(systemData[ilk][2]);
  });
});
