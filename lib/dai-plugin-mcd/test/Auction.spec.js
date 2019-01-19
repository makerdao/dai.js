import Maker from '@makerdao/dai';
import { mcdMaker } from './helpers';
const { DAI, ETH, MKR } = Maker;

describe.each([ETH, DAI, MKR])('flip, flop, flap', auctionCurrency => {
  let auction;

  beforeAll(async () => {
    const maker = await mcdMaker();
    const service = maker.service('auction');
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
