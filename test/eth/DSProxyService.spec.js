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

test('should find the proxy registry', () => {
  expect(service.proxyRegistry()).toBeDefined();
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

describe('querying the registry for the proxy address', () => {
  test('should return address when account has a proxy', async () => {
    await service.build();
    const proxyAddress = await service.getProxyAddress();
    expect(proxyAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/);
  });

  test("should return undefined when the account doesn't have a proxy", async () => {
    const proxyAddress = await service.getProxyAddress();
    console.log(proxyAddress);
    expect(proxyAddress).not.toBeDefined();
  });
});
