import { buildTestSmartContractService } from '../helpers/serviceBuilders';
import { getNewAccount, setNewAccount } from '../helpers/proxyHelpers';
import addresses from '../../contracts/addresses/testnet';
import Maker from '../../src/index';

let service;

beforeEach(async () => {
  const contractService = await buildTestSmartContractService();
  await contractService.manager().authenticate();
  service = contractService.get('transactionManager').get('proxy');
  service.setSmartContractService(contractService);
  await setNewAccount(service);
});

test('should find the proxy registry', () => {
  expect(service._proxyRegistry()).toBeDefined();
});

test('should build new proxies', async () => {
  await service.build();
  const newAddress = await service.currentProxy();
  expect(newAddress).not.toBeNull();
  expect(newAddress).not.toEqual('0x0000000000000000000000000000000000000000');
  expect(newAddress).not.toEqual(addresses.DS_PROXY.toLowerCase());
});

test('should throw error when attempting to build duplicate proxy', async () => {
  let error;
  await service.ensureProxy();
  const address = await service.currentProxy();
  try {
    await service.build();
  } catch (err) {
    error = err.message;
  }
  expect(error).toEqual(
    'This account already has a proxy deployed at ' + address
  );
});

test("should get a proxy's owner", async () => {
  await service.build();
  const address = await service.getProxyAddress();
  const owner = await service.getOwner(address);

  expect(owner.toLowerCase()).toEqual(service.get('web3').currentAddress());
});

test("should set a proxy's owner", async () => {
  await service.ensureProxy();
  const proxyAddress = await service.getProxyAddress();
  const originalOwner = await service.getOwner(proxyAddress);
  const newAccount = await getNewAccount(service);

  await service.setOwner(newAccount.address);
  const newOwner = await service.getOwner(proxyAddress);

  expect(newOwner.toLowerCase()).toEqual(newAccount.address.toLowerCase());
  expect(newOwner.toLowerCase()).not.toEqual(originalOwner.toLowerCase());
});

test('should ensure a dsproxy', async () => {
  let proxyAddress = await service.currentProxy();
  expect(proxyAddress).toBeNull();
  proxyAddress = await service.ensureProxy();
  expect(proxyAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/);
  proxyAddress = await service.ensureProxy();
  expect(proxyAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/);
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
    const contractService = maker.service('smartContract');
    // tubContract = maker.service('smartContract').getContract('SAI_TUB');
    await maker.service('proxy').ensureProxy();
  });

  test.skip('should execute without a provided proxy address', async () => {
    const hash = await maker
      .service('proxy')
      .execute(tubContract, 'open', [], { gasLimit: 4000000 });
    expect(hash).toMatch(/0x[a-f0-9]{64}/);
  });

  test.skip('should execute with a provided proxy address', async () => {
    const hash = await maker
      .service('proxy')
      .execute(
        tubContract,
        'open',
        [],
        {},
        await maker.service('proxy').currentProxy()
      );
    expect(hash).toMatch(/0x[a-f0-9]{64}/);
  });

  test.skip('should throw error if no proxy is available', async () => {
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
