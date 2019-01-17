import Maker from '@makerdao/dai';
import { mcdMaker } from './helpers';
const { DAI, ETH, MKR } = Maker;

describe('flip auction', () => {
  sharedTests(ETH);
});

describe('flap auction', () => {
  sharedTests(DAI);
});

describe('flop auction', () => {
  sharedTests(MKR);
});

function sharedTests(auctionCurrency) {
  let auction;

  beforeAll(async () => {
    const maker = await mcdMaker();
    const service = maker.service('auction');
    auction = service.getAuction(auctionCurrency);
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
    expect(time).toBe(0.05);
  });
}
