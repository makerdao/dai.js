import { buildTestNonceService } from '../helpers/serviceBuilders';

let nonceService;

beforeEach(async () => {
  nonceService = buildTestNonceService();
  await nonceService.manager().authenticate();
  await nonceService.setInitialTransactionCount();
});

test('should initialize with the default account', async () => {
  const count = nonceService._transactionCount;

  expect(typeof count).toBe('number');
  expect(count).toBeGreaterThan(0);
});

test('should increment transaction count to generate new nonce', async () => {
  const initialCount = nonceService._transactionCount;
  const newNonce = nonceService.getNewNonce();

  expect(newNonce).toEqual(initialCount + 1);
  expect(nonceService._transactionCount).toEqual(newNonce);
});
