import { buildTestService } from '../../helpers/serviceBuilders';

let service;

async function buildTestOasisDirectService() {
  service = buildTestService('oasisDirect', { oasisDirect: true });
  await service.manager().authenticate();
}

beforeEach(async () => {
  await buildTestOasisDirectService();
});

test('startin er up', () => {
  console.log(service);
});
