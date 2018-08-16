import { buildTestContainer } from '../helpers/serviceBuilders';

async function buildTestServices() {
  const container = buildTestContainer({
    web3: true,
    nonce: true
  });
  const web3 = container.service('web3');
  const nonceService = container.service('nonce');

  await web3.manager().authenticate();
  return {
    web3: web3,
    nonceService: nonceService
  };
}

test('should initialize with the default account', async () => {
  const services = await buildTestServices();
  console.log(services);
});
