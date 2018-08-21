import { buildTestNonceService } from '../helpers/serviceBuilders';

let nonceService;

beforeEach(async () => {
  nonceService = buildTestNonceService();
  await nonceService.manager().authenticate();
});

xtest('should increment transaction count to generate new nonce', async () => {
  const initialCount = nonceService._transactionCount;
  const newNonce = nonceService.getNonce();

  expect(newNonce).toEqual(initialCount + 1);
  expect(nonceService._transactionCount).toEqual(newNonce);
});
