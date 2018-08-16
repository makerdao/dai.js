import { buildTestNonceService } from '../helpers/serviceBuilders';

test('should initialize with the default account', async () => {
  // const services = await buildTestServices();
  // const web3Service = await buildTestWeb3Service().manager().authenticate();
  const nonceService = buildTestNonceService();
  await nonceService.manager().authenticate();
  // const initialNonce = await nonceService.setInitialNonce();
  console.log(await nonceService.setInitialNonce());
  // console.log(services.web3.defaultAccount());
});
