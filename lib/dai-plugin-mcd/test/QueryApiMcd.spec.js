import { mcdMaker } from './helpers';
import {ServiceRoles } from '../src/constants';

let service;
let maker;

beforeAll(async () => {
  maker = await mcdMaker();
  service = maker.service(ServiceRoles.QUERY_API);
});

test('getPriceHistoryForPip on kovan', async () => {
  const val = await service.getPriceHistoryForPip(
    '0x8C73Ec0fBCdEC6b8C060BC224D94740FD41f3774'
  );
  expect(!!val[0].val).toBe(true);
  expect(!!val[0].blockNumber).toBe(true);
});

test('getCdpEventsForIlkAndUrn on kovan', async () => {
  const val = await service.getCdpEventsForIlkAndUrn(
    '4554482d42000000000000000000000000000000000000000000000000000000',
    'cba1bbad5fe83cf0bc96028ae3ed8bb98b56986d000000000000000000000020'
  );
  expect(!!val[0].ilk).toBe(true);
  expect(!!val[0].tx).toBe(true);
  expect(!!val[0].dink).toBe(true);
  expect(!!val[0].dart).toBe(true);
  //expect(!!val[0].time).toBe(true);
  expect(!!val[0].urn).toBe(true);
});
