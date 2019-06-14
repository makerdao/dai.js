import { mcdMaker } from './helpers';
import { ServiceRoles } from '../src/constants';

const scenarios = [['ETH-A'], ['MDAI'], ['MKR']];

describe.each(scenarios)('%s', ilk => {
  let auction;

  beforeAll(async () => {
    const maker = await mcdMaker();
    const service = maker.service(ServiceRoles.AUCTION);
    auction = service.getAuction(ilk);
  });

  test('get max bid lifetime', async () => {
    const time = await auction.getMaxBidLifetime();
    expect(time).toBe(3);
  });

  test('get max auction duration', async () => {
    const time = await auction.getMaxAuctionDuration();
    expect(time).toBe(2);
  });

  test('get min bid increase', async () => {
    const time = await auction.getMinBidIncrease();
    if (ilk === 'MDAI' || ilk === 'MKR') {
      expect(time).toBe(0);
    } else {
      expect(time).toBe(0.05);
    }
  });
});
