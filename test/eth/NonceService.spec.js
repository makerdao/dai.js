import { buildTestNonceService } from '../helpers/serviceBuilders';

let nonceService;

beforeEach(async () => {
  nonceService = buildTestNonceService();
  await nonceService.manager().authenticate();
  nonceService.setNextNonce();
});

test('getTxCount returns the transaction count', async () => {
  const count = await nonceService._getTxCount();
  expect(typeof count).toEqual('number');
});

test('inject should inject the nonce in the proper place', async () => {
  const firstArgs = await nonceService.inject(['a', 2, { gasLimit: 400000 }]);
  const secondArgs = await nonceService.inject(['0x']);
  const thirdArgs = await nonceService.inject([
    '0x',
    { _bn: 'some BigNumber' }
  ]);

  expect(Object.keys(firstArgs[firstArgs.length - 1]).includes('nonce')).toBe(
    true
  );
  expect(secondArgs.length).toEqual(2);
  expect(typeof secondArgs[secondArgs.length - 1]).toEqual('object');
  expect(Object.keys(secondArgs[secondArgs.length - 1]).includes('nonce')).toBe(
    true
  );
  expect(thirdArgs.length).toEqual(3);
  expect(Object.keys(thirdArgs[thirdArgs.length - 1]).includes('nonce')).toBe(
    true
  );
  expect(Object.keys(thirdArgs[thirdArgs.length - 1]).includes('_bn')).toBe(
    false
  );
});

test('setNextNonce should set the next nonce in state', async () => {
  const originalCount = nonceService._nextNonce;
  nonceService._nextNonce = undefined;
  await nonceService.setNextNonce();

  expect(nonceService._nextNonce).toEqual(originalCount);
});

test('getNonce should return its own tx count if higher than node count', async () => {
  nonceService._nextNonce = 500000;
  const nonce = await nonceService.getNonce();

  expect(nonce).toEqual(500000);
});

test('getNonce should return tx count from node if higher than own count', async () => {
  nonceService._nextNonce = 0;
  const nonce = await nonceService.getNonce();

  expect(nonce).not.toEqual(0);
});

test('getNonce should return a nonce even when own count is undefined', async () => {
  nonceService._nextNonce = undefined;
  const nonce = await nonceService.getNonce();

  expect(typeof nonce).toEqual('number');
});
