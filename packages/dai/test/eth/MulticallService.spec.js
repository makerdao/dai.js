import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';
import { buildTestMulticallService } from '../helpers/serviceBuilders';
import schemas from '../helpers/schemas';
import addresses from '../../../dai-plugin-mcd/contracts/addresses/testnet.json';
import { first } from 'rxjs/operators';
// import { promiseWait } from '../../src/utils';

let service;
let watcher;
let address;

beforeEach(async () => {
  service = buildTestMulticallService();
  await service.manager().authenticate();
  address = TestAccountProvider.nextAddress();
  watcher = service.createWatcher({ interval: 'block' });
  service.registerSchemas(schemas);
  service._addresses = addresses;
  service.start();
});

test('get eth balance via multicall', async () => {
  watcher.stop();
  const initialBlock =
    (await service.get('web3').getBlock('latest')).number + 1;
  const initialEthBalance = service
    .get('web3')
    ._web3.utils.fromWei(
      (await service.get('web3').getBalance(address)).toString()
    );

  service.tap(() => [
    {
      call: ['getEthBalance(address)(uint256)', address],
      returns: [
        [
          'ETH_BALANCE',
          v => service.get('web3')._web3.utils.fromWei(v.toString())
        ]
      ]
    }
  ]);
  service.start();

  let ethBalance = '';
  const batchSub = watcher.subscribe(update => {
    if (update.type === 'ETH_BALANCE') ethBalance = update.value;
  });
  let blockNumber;
  const newBlockSub = watcher.onNewBlock(number => (blockNumber = number));

  await watcher.awaitInitialFetch();

  batchSub.unsub();
  newBlockSub.unsub();

  expect(ethBalance.toString()).toEqual(initialEthBalance);
  expect(parseInt(blockNumber)).toEqual(initialBlock);
});

test('watch multiple base observables from same schema', async () => {
  const observable1 = service.watchObservable('debtCeiling', 'ETH-A');
  const observable3 = service.watchObservable('debtScalingFactor', 'ETH-A');
  const debtCeilingEth = await observable1.pipe(first()).toPromise();
  const debtScalingFactorEth = await observable3.pipe(first()).toPromise();

  expect(Number(debtCeilingEth)).toEqual(100000);
  expect(Number(debtScalingFactorEth)).toEqual(1);
});

test('watch multiple base observables from same schema with different schema params', async () => {
  const observable1 = service.watchObservable('debtCeiling', 'ETH-A');
  const observable2 = service.watchObservable('debtCeiling', 'BAT-A');
  const debtCeilingEth = await observable1.pipe(first()).toPromise();
  const debtCeilingBat = await observable2.pipe(first()).toPromise();

  expect(Number(debtCeilingEth)).toEqual(100000);
  expect(Number(debtCeilingBat)).toEqual(5000);
});

test('watch computed observable', async () => {
  const observable = service.watchObservable('testComputed1', 'ETH-A');
  const testComputed1 = await observable.pipe(first()).toPromise();

  expect(testComputed1).toEqual(100001);
});

test('watch computed observable with computed dependency', async () => {
  const observable = service.watchObservable('testComputed2', 5);
  const testComputed2 = await observable.pipe(first()).toPromise();

  expect(testComputed2).toEqual(500005);
});

test('watch computed observable with promise dependency', async () => {
  const observable = service.watchObservable('testComputed3', 2);
  const testComputed3 = await observable.pipe(first()).toPromise();

  expect(testComputed3).toEqual(2000020);
});

test('watch computed observable with dynamically generated dependencies', async () => {
  const observable = service.watchObservable('ilkDebtCeilings', ['ETH-A', 'BAT-A']);
  const ilkDebtCeilings = await observable.pipe(first()).toPromise();

  expect(ilkDebtCeilings).toEqual([100000, 5000]);
});

test('watch same computed observable with dynamically generated dependencies more than once', async () => {
  const observable1 = service.watchObservable('ilkDebtCeilings', ['ETH-A', 'BAT-A']);
  const observable2 = service.watchObservable('ilkDebtCeilings', ['ETH-A', 'BAT-A']);
  const ilkDebtCeilings1 = await observable1.pipe(first()).toPromise();
  const ilkDebtCeilings2 = await observable2.pipe(first()).toPromise();

  expect(ilkDebtCeilings1).toEqual([100000, 5000]);
  expect(ilkDebtCeilings2).toEqual([100000, 5000]);
});
