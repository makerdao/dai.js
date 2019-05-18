import { mcdMaker } from './helpers';
import { ServiceRoles } from '../src/constants';
import { infuraProjectId } from '../../../test/helpers/serviceBuilders';
import { MDAI, ETH } from '../src/index';

let service;
let kovanService;
let maker;
let kovanMaker;

beforeAll(async () => {
  //setup kovan maker
  const settings = {
    web3: {
      provider: {
        infuraProjectId
      }
    }
  };
  kovanMaker = await mcdMaker({
    preset: 'kovan',
    network: 'kovan',
    ...settings
  });
  kovanService = kovanMaker.service(ServiceRoles.QUERY_API);

  //setup local maker
  maker = await mcdMaker(); //testnent maker
  service = maker.service(ServiceRoles.QUERY_API);
});

//this test currently uses the kovan server since the price data is not in the local vulcanize db yet
//skipping this test for CI since it uses the remote vdb instance, which doesn't always work
//todo: look into the error that vulcanize sometimes returns
xtest('getPriceHistory for ETH', async () => {
  const prices = await kovanService.getPriceHistory('ETH-B');
  expect(prices[0].price.toNumber() > 10).toBe(true);
  expect(prices[0].time instanceof Date).toBe(true);
});

function expectCdpEventObject(object, collateralCurrency = ETH) {
  //expect(object.transactionHash.length).toBe(66); //commented out for now since the local vdb instance doesn't have transaction data yet
  //expect(object.time instanceof Date).toBe(true); //commented out for now since the local vdb instance doesn't have transaction data yet
  expect(collateralCurrency.isInstance(object.changeInCollateral)).toBe(true);
  expect(object.changeInCollateral.gt(0)).toBe(true);
  expect(collateralCurrency.isInstance(object.resultingCollateral)).toBe(true);
  expect(object.collateralAction).toBe('lock' || 'free');
  expect(MDAI.isInstance(object.changeInDebt)).toBe(true);
  expect(object.changeInDebt.gt(0)).toBe(true);
  expect(MDAI.isInstance(object.resultingDebt)).toBe(true);
  expect(object.daiAction).toBe('draw' || 'wipe');
}

//skipping this test for CI since it currently uses the local vdb which isn't setup in travis
xtest('getCdpEventsForIlkAndUrn', async () => {
  const events = await service.getCdpEventsForIlkAndUrn(
    'ETH-A',
    '4f0f278d36',
    'F651F'
  );
  expectCdpEventObject(events[0], ETH);
});

test.only('getCdpEvents for all cdps owned by an address', async () => {
  const proxy = await maker.currentProxy();
  const events = await service.getCdpEventsForAddress(proxy);
  expectCdpEventObject(events[0], ETH);
});
