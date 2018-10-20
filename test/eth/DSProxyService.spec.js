import { buildTestService } from '../helpers/serviceBuilders';

let service;

async function buildTestProxyService() {
  service = buildTestService('proxy', { proxy: true });
  await service.manager().authenticate();
}

beforeEach(async () => {
  await buildTestProxyService();
  const owner = await service.getProxyAddress();
  if (owner !== '0x0000000000000000000000000000000000000000') {
    await service.clearOwner();
  }
});

test('should set the default proxy address', async () => {
  const address = await service.getProxyAddress();
  expect(service._defaultAddress).toEqual(address);
});
