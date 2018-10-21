import { buildTestService } from '../helpers/serviceBuilders';
import TestAccountProvider from '../helpers/TestAccountProvider';

let service,
  accountCount = 20;

async function buildTestProxyService() {
  service = buildTestService('proxy', { proxy: true });
  await service.manager().authenticate();
}

async function setNewAccount() {
  accountCount += 1;
  const account = TestAccountProvider.nextAccount(accountCount);
  const accountService = service.get('web3').get('accounts');
  await accountService.addAccount('newAccount', {
    type: 'privateKey',
    key: account.key
  });
  accountService.useAccount('newAccount');
}

beforeEach(async () => {
  await buildTestProxyService();
  await setNewAccount();
});

test('should set the default proxy address', async () => {
  const address = await service.getProxyAddress();
  expect(service.defaultProxyAddress()).toEqual(address);
});

test('should build new proxies', async () => {
  await service.build();
  const proxyAddress = await service.getProxyAddress();
  expect(proxyAddress).not.toEqual(
    '0x0000000000000000000000000000000000000000'
  );
});
