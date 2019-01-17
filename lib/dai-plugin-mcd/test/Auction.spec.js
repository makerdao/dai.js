import Maker from '@makerdao/dai';
import { mcdMaker } from './helpers';
const { DAI, ETH, MKR } = Maker;

let flipAuction;
let flopAuction;
let flapAuction;

beforeAll(async () => {
  const maker = await mcdMaker();
  const service = maker.service('auction');
  flipAuction = service.getAuction(ETH);
  flapAuction = service.getAuction(DAI);
  flopAuction = service.getAuction(MKR);
});

describe('flip auction', () => {
  sharedTests(flipAuction);
});

describe('flap auction', () => {
  sharedTests(flapAuction);
});

describe('flop auction', () => {
  sharedTests(flopAuction);
});

function sharedTests(auction) {
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
