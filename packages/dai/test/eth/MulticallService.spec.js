import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';
import { buildTestMulticallService } from '../helpers/serviceBuilders';

let service;
let watcher;
let address;

beforeAll(async () => {
  service = buildTestMulticallService();
  await service.manager().authenticate();
  address = TestAccountProvider.nextAddress();
  watcher = service.createWatcher({ interval: 'block' });
});

test('get eth balance via multicall', async () => {
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
