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

test('getPriceHistoryForPip on kovan', async () => {
  const val = await service.getPriceHistoryForPip(
    '0x8C73Ec0fBCdEC6b8C060BC224D94740FD41f3774'
  );
  expect(!!val[0].val).toBe(true);
  expect(!!val[0].blockNumber).toBe(true);
});

test('getCdpEventsForIlkAndUrn on kovan', async () => {
  const val = await service.getCdpEventsForIlkAndUrn(
    'ETH-B',
    'cba1bbad5fe83cf0bc96028ae3ed8bb98b56986d000000000000000000000020'
  );
  expect(!!val[0].ilk).toBe(true);
  expect(!!val[0].tx).toBe(true);
  expect(val[0].time instanceof Date).toBe(true);
  expect(val[0].collateralAmount).toEqual(ETH(.1));
  expect(val[0].collateralAction).toBe('lock');
  expect(val[0].daiAmount).toEqual(MDAI(1));
  expect(val[0].daiAction).toBe('draw');
  expect(!!val[0].urn).toBe(true);
});
