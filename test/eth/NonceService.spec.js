import { buildTestNonceService } from '../helpers/serviceBuilders';

test('should initialize with the default account', async () => {
  const nonceService = buildTestNonceService();
  await nonceService.manager().authenticate();
  await nonceService.setInitialTransactionCount();
  const count = nonceService._transactionCount;

  expect(typeof count).toBe('number');
  expect(count).toBeGreaterThan(0);
});
