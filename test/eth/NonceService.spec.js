import { buildTestNonceService } from '../helpers/serviceBuilders';

let nonceService;

beforeEach(async () => {
  nonceService = buildTestNonceService();
  await nonceService.manager().authenticate();
});

function currentAccount() {
  return nonceService._web3Service.currentAccount();
}

test('should properly fetch the transaction count', async () => {
  const count = await nonceService._getTxCount(currentAccount());

  expect(typeof count).toEqual('number');
  expect(count).toBeGreaterThan(0);
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

test('should properly initialize the counts in state', async () => {
  const originalCounts = nonceService._counts;
  nonceService._counts = {};
  await nonceService.setCounts();

  expect(typeof nonceService._counts).toEqual('object');
  expect(nonceService._counts).toEqual(originalCounts);
  expect(Object.keys(nonceService._counts).includes(currentAccount()));
});

test('should set different counts for each signer', async () => {
  await nonceService.setCounts();

  expect(typeof nonceService._counts).toEqual('object');
  expect(Object.keys(nonceService._counts).length).toEqual(1);
});

test('should return its own tx count if higher than count from node', async () => {
  nonceService._counts[currentAccount()] = 500000;
  const nonce = await nonceService.getNonce();

  expect(nonce).toEqual(500000);
});

test('should return tx count from node if higher than own count', async () => {
  nonceService._counts[currentAccount()] = 0;
  const nonce = await nonceService.getNonce();

  expect(nonce).not.toEqual(0);
});

test('should return a nonce even when own count is undefined', async () => {
  nonceService._counts = undefined;
  const nonce = await nonceService.getNonce();

  expect(typeof nonce).toEqual('number');
});
