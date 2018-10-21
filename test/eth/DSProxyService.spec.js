import { buildTestService } from '../helpers/serviceBuilders';
import TestAccountProvider from '../helpers/TestAccountProvider';

let service, accountService;
const account = TestAccountProvider.nextAccount(20);

async function buildTestProxyService() {
  service = buildTestService('proxy', { proxy: true });
  await service.manager().authenticate();
}

beforeEach(async () => {
  await buildTestProxyService();
  accountService = service.get('web3').get('accounts');
  await accountService.addAccount('newAccount', {
    type: 'privateKey',
    key: account.key
  });
  accountService.useAccount('newAccount');
  // const owner = await service.getOwner();
  // console.log(owner);
  console.log(service.get('web3').currentAccount());
  // console.log(account);
  // if (owner !== '0x0000000000000000000000000000000000000000') {
  //   console.log('here do');
  //   await service.clearOwner();
  // }
});

test('should set the default proxy address', async () => {
  const address = await service.getProxyAddress();
  expect(service.defaultProxyAddress()).toEqual(address);
});

test('should be able to build a new proxy', async () => {
  // console.log(await service.getProxyAddress());
  await service.build();
});
