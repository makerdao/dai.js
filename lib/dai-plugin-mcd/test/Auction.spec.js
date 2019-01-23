import Maker from '@makerdao/dai';
import { mcdMaker } from './helpers';
import { ServiceRoles } from '../src/constants';
const { DAI, ETH, MKR } = Maker;

const scenarios = [ETH, DAI, MKR].map(c => [c.symbol, c]);

describe.each(scenarios)('%s', (symbol, auctionCurrency) => {
  let auction;

  beforeAll(async () => {
    const maker = await mcdMaker();
    const service = maker.service(ServiceRoles.AUCTION);
    auction = service.getAuction(auctionCurrency);
  });

  test(`get max bid lifetime for ${
    auctionCurrency.symbol
  } auction`, async () => {
    const time = await auction.getMaxBidLifetime();
    expect(time).toBe(3);
  });

  test(`get max auction duration ${
    auctionCurrency.symbol
  } auction`, async () => {
    const time = await auction.getMaxAuctionDuration();
    expect(time).toBe(2);
  });

  test(`get min bid increase ${auctionCurrency.symbol} auction`, async () => {
    const time = await auction.getMinBidIncrease();
    expect(time).toBe(0.05);
  });
});
