import { mcdMaker } from './helpers';
import { ServiceRoles } from '../src/constants';
import { infuraProjectId } from '../../../test/helpers/serviceBuilders';

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
//todo: look into the error that vulcanize sometimes returns
test('getPriceHistoryForPip for ETH', async () => {
  const prices = await kovanService.getPriceHistoryForPip(
    '0x8C73Ec0fBCdEC6b8C060BC224D94740FD41f3774'
  );
  expect(!!prices[0].val && !!prices[0].blockNumber).toBe(true);
  /*expect(prices[0].price.toNumber() > 10).toBe(true);
  expect(prices[0].time instanceof Date).toBe(true);*/
});

/*function expectCdpEventObject(object, collateralCurrency = ETH) {
  expect(object.transactionHash.length).toBe(66);
  expect(object.time instanceof Date).toBe(true);
  expect(object.senderAddress.length).toBe(42);
  expect(collateralCurrency.isInstance(object.changeInCollateral)).toBe(true);
  expect(object.changeInCollateral.gte(0)).toBe(true);
  expect(collateralCurrency.isInstance(object.resultingCollateral)).toBe(true);
  if (object.changeInCollateral.gt(0))
    expect(object.collateralAction).toBe('lock' || 'free');
  expect(MDAI.isInstance(object.changeInDebt)).toBe(true);
  expect(object.changeInDebt.gte(0)).toBe(true);
  expect(MDAI.isInstance(object.resultingDebt)).toBe(true);
  if (object.changeInDebt.gt(0))
    expect(object.daiAction).toBe('draw' || 'wipe');
}*/

function expectFrobEvents(events){
  const event = events[0];
  expect(
    !!event.dart &&
      !!event.dink &&
      !!event.ilk.nodes[0].rate &&
      !!event.tx.transactionHash &&
      !!event.tx.txFrom &&
      !!event.tx.era.iso &&
      !!event.urn.nodes[0].art &&
      !!event.urn.nodes[0].ink
  ).toBe(true);
  expect(new Date(events[0].tx.era.iso) > new Date(events[1].tx.era.iso)).toBe(true);
}

test('getCdpEventsForIlkAndUrn', async () => {
  const events = await service.getCdpEventsForIlkAndUrn(
    '4FE14',
    '0x8392807d646cf6300b9fcd1fbd35fb2e4b738d75'
  );
  expectFrobEvents(events);
});

test('getCdpEventsForArrayOfIlksAndUrns', async () => {
  const events = await service.getCdpEventsForArrayOfIlksAndUrns(
  [
    {ilk:'4FE14',
    urn: '0x8392807d646cf6300b9fcd1fbd35fb2e4b738d75'
    },
    {ilk:'4FE14',
    urn: '0x98c06a86a1bc4a2689a83494a018274067572798'
    }
  ]
  );
  expectFrobEvents(events);
});
