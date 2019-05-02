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
  expect(prices[0].price).toEqual(ETH(143));
  expect(prices[0].time instanceof Date).toBe(true);
});

test('getCdpEvents for ETH-B', async () => {
  const events = await service.getCdpEvents(
    'cba1bbad5fe83cf0bc96028ae3ed8bb98b56986d000000000000000000000020', //vulcanize points to v2.2.2 of the contracts, so the urn argument will be updated once vulcanize is updated
    'ETH-B'
  );
  expect(!!events[0].tx).toBe(true);
  expect(events[0].time instanceof Date).toBe(true);
  expect(events[0].collateralAmount).toEqual(ETH(0.1));
  expect(events[0].collateralAction).toBe('lock');
  expect(events[0].daiAmount).toEqual(MDAI(1));
  expect(events[0].daiAction).toBe('draw');
});

test.only('getCdpEvents for all ilks', async () => {
  const events = await service.getCdpEvents(
    'cba1bbad5fe83cf0bc96028ae3ed8bb98b56986d000000000000000000000020' //vulcanize points to v2.2.2 of the contracts, so the urn argument will be updated once vulcanize is updated
  );
  console.log('events', events);
});
