import { buildTestService } from '../helpers/serviceBuilders';

let service;

async function buildTestProxyService() {
  service = buildTestService('proxy', { proxy: true });
  await service.manager().authenticate();
}

beforeEach(async () => {
  await buildTestProxyService();
  const owner = await service.getOwner();
  if (owner !== '0x0000000000000000000000000000000000000000') {
    console.log('here do');
    await service.clearOwner();
  }
});

test('should set the default proxy address', async () => {
  const address = await service.getProxyAddress();
  expect(service.defaultProxyAddress()).toEqual(address);
});
