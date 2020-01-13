import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';
import { buildTestMulticallService } from '../helpers/serviceBuilders';
import schemas from '../helpers/schemas';
import addresses from '../../../dai-plugin-mcd/contracts/addresses/testnet.json';
import { first } from 'rxjs/operators';

let service;
let watcher;
let address;

beforeEach(async () => {
  service = buildTestMulticallService();
  await service.manager().authenticate();
  address = TestAccountProvider.nextAddress();
  watcher = service.createWatcher({ interval: 'block' });
  service.addresses = addresses;
  service.registerSchemas(Object.values(schemas));
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

test('watch 2 base observables from same schema', async () => {
  const observable1 = service.watchObservable('debtCeiling', 'ETH-A');
  const observable2 = service.watchObservable('debtScalingFactor', 'ETH-A');
  const debtCeiling = await observable1.pipe(first()).toPromise();
  const debtScalingFactor = await observable2.pipe(first()).toPromise();

  expect(Number(debtCeiling)).toEqual(100000);
  expect(Number(debtScalingFactor)).toEqual(1);
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
