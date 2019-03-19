import { mcdMaker } from './helpers';
import { ServiceRoles } from '../src/constants';

let maker;

beforeAll(async () => {
  maker = await mcdMaker();
});

test('getCdp looks up ilk', async () => {
  const mgr = maker.service(ServiceRoles.CDP_MANAGER);
  const cdp = await mgr.open('ETH-A');
  const sameCdp = await mgr.getCdp(cdp.id);
  expect(sameCdp.ilk).toEqual(cdp.ilk);
});
