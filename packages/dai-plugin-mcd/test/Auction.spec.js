import { mcdMaker } from './helpers';
import { ServiceRoles } from '../src/constants';

const scenarios = [['ETH-A'], ['MDAI'], ['MKR']];

/*
  The following arrays are expected values for each tested
  collateral type. The defined values are:
  [max bid lifetime, min bid increase]
*/
const systemData = {
  'ETH-A': [1, 0.01],
  MDAI: [3, 0.05],
  MKR: [3, 0.05]
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

  test('get max auction duration', async () => {
    const time = await auction.getMaxAuctionDuration();
    expect(time).toBe(2);
  });

  test('get min bid increase', async () => {
    const time = await auction.getMinBidIncrease();
    expect(time).toBe(systemData[ilk][1]);
  });
});
