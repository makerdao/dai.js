import { mcdMaker } from './helpers';
import { ServiceRoles } from '../src/constants';
import { infuraProjectId } from '../../../test/helpers/serviceBuilders';
import { MDAI, ETH } from '../src/index';

let service;
let maker;

beforeAll(async () => {
  const settings = {
    web3: {
      provider: {
        infuraProjectId
      }
    }
  };
  maker = await mcdMaker({
    preset: 'kovan',
    network: 'kovan',
    ...settings
  });
  service = maker.service(ServiceRoles.QUERY_API);
});

//todo: pass in ilk or currency instead of pip address
test('getPriceHistory for ETH', async () => {
  const prices = await service.getPriceHistory('ETH-B');
  expect(prices[0].price.toNumber() > 10).toBe(true);
  expect(prices[0].time instanceof Date).toBe(true);
});

function expectCdpEventObject(object, collateralCurrency = ETH) {
  expect(object.transactionHash.length).toBe(66);
  expect(object.time instanceof Date).toBe(true);
  expect(collateralCurrency.isInstance(object.changeInCollateral)).toBe(true);
  expect(object.changeInCollateral.gt(0)).toBe(true);
  expect(collateralCurrency.isInstance(object.resultingCollateral)).toBe(true);
  expect(object.collateralAction).toBe('lock' || 'free');
  expect(MDAI.isInstance(object.changeInDebt)).toBe(true);
  expect(object.changeInDebt.gt(0)).toBe(true);
  expect(MDAI.isInstance(object.resultingDebt)).toBe(true);
  expect(object.daiAction).toBe('draw' || 'wipe');
}

test.only('getCdpEvents for ETH-B', async () => {
  // const events = await service.getCdpEventsForCdpId(
  //   'cba1bbad5fe83cf0bc96028ae3ed8bb98b56986d000000000000000000000020',
  //   'ETH-B'
  // );
  const events = await service.getCdpEventsForCdpId(1);
  console.log('events', events);
  expectCdpEventObject(events[0], ETH);
});

test('getCdpEvents for all ilks', async () => {
  const events = await service.getCdpEventsForAddress(
    '' //todo: pass in a proxy address that I know has cdps in vulcanize (figure out how to find this out in vdb)
  );
  expectCdpEventObject(events[0], ETH);
});
