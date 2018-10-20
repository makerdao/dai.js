import { buildTestService } from '../helpers/serviceBuilders';

let service;

async function buildTestProxyService() {
  service = buildTestService('proxy', { proxy: true });
  await service.manager().authenticate();
}

beforeEach(async () => {
  await buildTestProxyService();
});

test('tests are working', async () => {
  console.log(service);
});
