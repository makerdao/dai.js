import { buildTestNonceService } from '../helpers/serviceBuilders';

let nonceService;

beforeEach(async () => {
  nonceService = buildTestNonceService();
  await nonceService.manager().authenticate();
});

test('should properly fetch the transaction count', async () => {
  const count = await nonceService._getTxCount();
  expect(typeof count).toEqual('number');
});

test('should inject the nonce in the proper place in args list', async () => {
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

test('should properly initialize the count in state', async () => {
  const originalCount = nonceService._count;
  nonceService._count = undefined;
  // await nonceService.setNextNonce();

  expect(nonceService._count).toEqual(originalCount);
});

test('should set different counts for each signer', async () => {
  await nonceService.setCounts();
  console.log(nonceService._counts);

  expect(typeof nonceService._counts).toEqual('object');
  expect(Object.keys(nonceService._counts).length).toEqual(1);
});

test('should return tx count from node if higher than own count', async () => {
  nonceService._count = 0;
  const nonce = await nonceService.getNonce();

  expect(nonce).not.toEqual(0);
});

test('should return a nonce even when own count is undefined', async () => {
  nonceService._count = undefined;
  const nonce = await nonceService.getNonce();

  expect(typeof nonce).toEqual('number');
});
