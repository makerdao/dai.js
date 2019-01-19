import { buildTestService } from '../helpers/serviceBuilders';
import TestAccountProvider from '../helpers/TestAccountProvider';
import addresses from '../../contracts/addresses/testnet';
import Maker from '../../src/index';

let service;

async function buildTestProxyService() {
  service = buildTestService('proxy', { proxy: true });
  await service.manager().authenticate();
}

async function setNewAccount() {
  const account = TestAccountProvider.nextAccount();
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

test('should get the correct network', () => {
  expect(service._network()).toEqual('test');
});

test('should get the correct registry info', () => {
  const expected = ['version', 'address', 'abi'];
  expect(Object.keys(service._registryInfo())).toEqual(expected);
});

test('should find the proxy registry', () => {
  expect(service._proxyRegistry()).toBeDefined();
});

test('should build new proxies', async () => {
  await service.build();
  const newAddress = await service.currentProxy();
  expect(newAddress).not.toEqual('0x0000000000000000000000000000000000000000');
  expect(newAddress).not.toEqual(addresses.DS_PROXY.toLowerCase());
});

test("should get a proxy's owner", async () => {
  await service.build();
  const address = await service.getProxyAddress();
  const owner = await service.getOwner(address);

  expect(owner.toLowerCase()).toEqual(service.get('web3').currentAddress());
});

test("should set a proxy's owner", async () => {
  await service.build();
  const proxyAddress = await service.getProxyAddress();
  const originalOwner = await service.getOwner(proxyAddress);
  const newAddress = TestAccountProvider.nextAccount().address;
  await service.setOwner(newAddress);
  const newOwner = await service.getOwner(proxyAddress);

  expect(newOwner.toLowerCase()).toEqual(newAddress.toLowerCase());
  expect(newOwner.toLowerCase()).not.toEqual(originalOwner.toLowerCase());
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

describe('querying service for current proxy address', () => {
  test('should return address when account has a proxy', async () => {
    await service.build();
    const address = await service.getProxyAddress();
    expect(await service.currentProxy()).toEqual(address);
  });

  test("should return null when account doesn't have a proxy", async () => {
    await service.getProxyAddress();
    expect(await service.currentProxy()).toBeNull();
  });

  test('should update default address after building new proxy', async () => {
    const defaultBeforeBuilding = await service.currentProxy();
    await service.build();
    const address = await service.currentProxy();

    expect(defaultBeforeBuilding).toBeNull();
    expect(address).toMatch(/^0x[A-Fa-f0-9]{40}$/);
  });
});

describe('execute', () => {
  let maker, tubContract;

  beforeAll(async () => {
    maker = await Maker.create('test', {
      web3: { confirmedBlockCount: '0' },
      log: false
    });
    await maker.authenticate();
    tubContract = maker.service('smartContract').getContractByName('SAI_TUB');
  });

  test('should execute without a provided proxy address', async () => {
    const hash = await maker
      .service('proxy')
      .execute(tubContract, 'open', [], { gasLimit: 4000000 });
    expect(hash).toMatch(/0x[a-f0-9]{64}/);
  });

  test('should execute with a provided proxy address', async () => {
    const hash = await maker
      .service('proxy')
      .execute(
        tubContract,
        'open',
        [],
        { gasLimit: 4000000 },
        await maker.service('proxy').currentProxy()
      );
    expect(hash).toMatch(/0x[a-f0-9]{64}/);
  });

  test('should throw error if no proxy is available', async () => {
    expect.assertions(1);
    maker.service('proxy')._currentProxy = null;
    try {
      maker
        .service('proxy')
        .execute(tubContract, 'open', [], { gasLimit: 4000000 });
    } catch (err) {
      expect(err.message).toEqual('No proxy found for current account');
    }
  });
});
