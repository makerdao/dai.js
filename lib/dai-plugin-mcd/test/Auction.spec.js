import { mcdMaker } from './helpers';
import { ServiceRoles } from '../src/constants';
import { ETH, MDAI, MKR } from '../src';

const scenarios = [['ETH-A', ETH], ['MDAI', MDAI], ['MKR', MKR]];

describe.each(scenarios)('%s', (ilk, currency) => {
  let auction;

  beforeAll(async () => {
    const maker = await mcdMaker();
    const service = maker.service(ServiceRoles.AUCTION);
    auction = service.getAuction(ilk);
  });

  test(`get max bid lifetime for ${
    currency.symbol
  } auction`, async () => {
    const time = await auction.getMaxBidLifetime();
    expect(time).toBe(3);
  });

  test(`get max auction duration ${
    currency.symbol
  } auction`, async () => {
    const time = await auction.getMaxAuctionDuration();
    expect(time).toBe(2);
  });

  test(`get min bid increase ${currency.symbol} auction`, async () => {
    const time = await auction.getMinBidIncrease();
    expect(time).toBe(0.05);
  });
});
