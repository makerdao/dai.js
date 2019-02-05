import { buildTestSmartContractService } from '../helpers/serviceBuilders';
import { getNewAccount, setNewAccount } from '../helpers/proxyHelpers';
import addresses from '../../contracts/addresses/testnet';
import Maker from '../../src/index';
import { ETH, DAI } from '../../src/eth/Currency';
import TransactionObject from '../../src/eth/TransactionObject';
import { createDai, placeLimitOrder } from '../helpers/oasisHelpers';
import Eth2DaiDirect from '../../src/exchanges/oasis/Eth2DaiDirect';

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
  service
    .get('web3')
    .get('event')
    .on('dsproxy/BUILD', eventObj => {
      expect(eventObj.payload.address).toEqual(service._currentProxy);
    });
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
  let maker, args, currentAddress, eth, proxy;

  beforeAll(async () => {
    maker = await Maker.create('test', {
      web3: { confirmedBlockCount: '0' },
      log: false,
      exchange: Eth2DaiDirect
    });
    await maker.authenticate();
    currentAddress = maker.service('web3').currentAddress();
    eth = maker.service('token').getToken('ETH');
    proxy = await maker.service('proxy').ensureProxy();
    await maker.service('allowance').requireAllowance('WETH', proxy);
    await createDai(maker.service('exchange'));
    await placeLimitOrder(maker.service('exchange'), true);
    const oasisDirect = maker
      .service('smartContract')
      .getContract('OASIS_PROXY');
    args = [
      oasisDirect,
      'buyAllAmountPayEth',
      [
        '0x06ef37a95603cb52e2dff4c2b177c84cdb3ce989',
        '0xc226f3cd13d508bc319f4f4290172748199d6612',
        DAI(0.01).toEthersBigNumber(),
        '0x7ba25f791fa76c3ef40ac98ed42634a8bc24c238'
      ],
      { gasLimit: 4000000, value: ETH.wei(20).toEthersBigNumber() }
    ];
  });

  test('should execute without a provided proxy address', async () => {
    const initialBalance = await eth.balanceOf(currentAddress);
    const txo = new TransactionObject(
      maker.service('proxy').execute(...args),
      maker.service('web3'),
      maker.service('nonce')
    );
    await txo.confirm();
    const newBalance = await eth.balanceOf(currentAddress);
    expect(newBalance.toNumber()).toBeLessThan(initialBalance.toNumber());
  });

  test('should execute with a provided proxy address', async () => {
    const initialBalance = await eth.balanceOf(currentAddress);
    const txo = new TransactionObject(
      maker.service('proxy').execute(...args, proxy),
      maker.service('web3'),
      maker.service('nonce')
    );
    await txo.confirm();
    const newBalance = await eth.balanceOf(currentAddress);
    expect(newBalance.toNumber()).toBeLessThan(initialBalance.toNumber());
  });

  test('should throw error if no proxy is available', async () => {
    expect.assertions(1);
    maker.service('proxy')._currentProxy = null;
    try {
      maker.service('proxy').execute(...args);
    } catch (err) {
      expect(err.message).toEqual('No proxy found for current account');
    }
  });
});
