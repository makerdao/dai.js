import { buildTestService } from '../helpers/serviceBuilders';
import TestAccountProvider from '../helpers/TestAccountProvider';
import addresses from '../../testchain/out/addresses.json';

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

test('should build new proxies', async () => {
  await service.build();
  const newAddress = await service.defaultProxyAddress();
  expect(newAddress).not.toEqual('0x0000000000000000000000000000000000000000');
  expect(newAddress).not.toEqual(addresses.DS_PROXY.toLowerCase());
});

test("should get a proxy's owner", async () => {
  await service.build();
  await service.getProxyAddress();
  const owner = await service.getOwner();

  expect(owner.toLowerCase()).toEqual(service.get('web3').currentAccount());
});

xtest("should clear a proxy's owner", async () => {
  await service.build();
  await service.getProxyAddress();
  await service.clearOwner();
  expect(service.defaultProxyAddress()).toBeNull();
});

describe('querying registry for proxy address', () => {
  test('should return address when account has a proxy', async () => {
    await service.build();
    const proxyAddress = await service.getProxyAddress();
    expect(proxyAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/);
  });

  test("should return null when account doesn't have a proxy", async () => {
    const proxyAddress = await service.getProxyAddress();
    expect(proxyAddress).toBeNull();
  });
});

describe('querying service for default proxy address', () => {
  test('should return address when account has a proxy', async () => {
    await service.build();
    const address = await service.getProxyAddress();
    expect(service.defaultProxyAddress()).toEqual(address);
  });

  test("should return null when account doesn't have a proxy", async () => {
    await service.getProxyAddress();
    expect(service.defaultProxyAddress()).toBeNull();
  });

  test('should update default address after building new proxy', async () => {
    await service.build();
    const firstAddress = await service.defaultProxyAddress();
    await service.clearOwner();
    await service.build();
    const secondAddress = await service.defaultProxyAddress();

    expect(firstAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/);
    expect(secondAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/);
    expect(firstAddress).not.toEqual(secondAddress);
  });
});
