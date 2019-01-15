import { buildTestService } from '../../helpers/serviceBuilders';
import { setProxyAccount, setNewAccount } from '../../helpers/proxyHelpers';
import TestAccountProvider from '../../helpers/TestAccountProvider';
import createDaiAndPlaceLimitOrder from '../../helpers/oasisHelpers';

let service, proxyAccount;

async function buildTestOasisDirectService() {
  service = buildTestService('exchange', {
    exchange: 'OasisDirectService'
  });
  await service.manager().authenticate();
}

function proxy() {
  return service.get('proxy').currentProxy();
}

beforeEach(async () => {
  await buildTestOasisDirectService();
  jest.setTimeout(30000);
});

describe('format contract call', () => {
  test('set contract method', async () => {
    const proxy = await service.get('proxy').currentProxy();
    const buyEth = service._setMethod('DAI', 'ETH', 'sellAllAmount');
    const payEth = service._setMethod('ETH', 'DAI', 'sellAllAmount', proxy);
    const createAndPayEth = service._setMethod('ETH', 'DAI', 'sellAllAmount');
    const sell = service._setMethod('DAI', 'MKR', 'sellAllAmount');
    expect(buyEth).toEqual('sellAllAmountBuyEth');
    expect(payEth).toEqual('sellAllAmountPayEth');
    expect(createAndPayEth).toEqual('createAndSellAllAmountPayEth');
    expect(sell).toEqual('sellAllAmount');
  });

  test('set contract parameters', async () => {
    const otcAddress = service
      .get('smartContract')
      .getContractByName('MAKER_OTC').address;
    const registryAddress = service
      .get('smartContract')
      .getContractByName('PROXY_REGISTRY').address;
    const daiAddress = service
      .get('token')
      .getToken('DAI')
      .address();
    const wethAddress = service
      .get('token')
      .getToken('WETH')
      .address();
    const normalParams = await service._buildParams(
      'DAI',
      '0.01',
      'WETH',
      service._valueForContract(0, 'WETH'),
      'sellAllAmount'
    );
    const ethParams = await service._buildParams(
      'WETH',
      '0.01',
      'DAI',
      service._valueForContract(100, 'WETH'),
      'sellAllAmountPayEth'
    );
    const buyAndPayEthParams = await service._buildParams(
      'WETH',
      '0.01',
      'DAI',
      service._valueForContract(100, 'WETH'),
      'buyAllAmountPayEth'
    );
    const createParams = await service._buildParams(
      'WETH',
      '0.01',
      'DAI',
      service._valueForContract(100, 'WETH'),
      'createAndSellAllAmountPayEth'
    );

    expect(normalParams.length).toEqual(5);
    expect(normalParams[0]).toEqual(otcAddress);
    expect(normalParams[1]).toEqual(daiAddress);
    expect(Object.keys(normalParams[2])).toEqual(['_bn']);
    expect(normalParams[3]).toEqual(wethAddress);
    expect(Object.keys(normalParams[4])).toEqual(['_bn']);

    expect(ethParams.length).toEqual(4);
    expect(ethParams[0]).toEqual(otcAddress);
    expect(ethParams[1]).toEqual(wethAddress);
    expect(ethParams[2]).toEqual(daiAddress);
    expect(Object.keys(ethParams[3])).toEqual(['_bn']);

    expect(buyAndPayEthParams.length).toEqual(4);
    expect(buyAndPayEthParams[0]).toEqual(otcAddress);
    expect(buyAndPayEthParams[1]).toEqual(daiAddress);
    expect(Object.keys(buyAndPayEthParams[2])).toEqual(['_bn']);
    expect(buyAndPayEthParams[3]).toEqual(wethAddress);

    expect(createParams.length).toEqual(4);
    expect(createParams[0]).toEqual(registryAddress);
    expect(createParams[1]).toEqual(otcAddress);
    expect(createParams[2]).toEqual(daiAddress);
    expect(Object.keys(createParams[3])).toEqual(['_bn']);
  });

  test('set transaction options', () => {
    const normalOptions = service._buildOptions(1, 'DAI', 'method');
    const ethOptions = service._buildOptions(1, 'ETH', 'method');
    const createOptions = service._buildOptions(1, 'ETH', 'create');
    expect(Object.keys(normalOptions)).toEqual(['otc', 'dsProxy']);
    expect(Object.keys(ethOptions)).toEqual(['value', 'otc', 'dsProxy']);
    expect(Object.keys(createOptions)).toEqual(['value', 'otc']);
  });
});

describe('values from otc', () => {
  beforeAll(async () => {
    await createDaiAndPlaceLimitOrder(service);
  });

  test('get buy amount', async () => {
    const buyAmount = await service.getBuyAmount('WETH', 'DAI', '0.01');
    expect(Object.keys(buyAmount)).toEqual(['_bn']);
    expect(buyAmount.toString()).toEqual('500000000000000');
  });

  test('get minBuyAmount', async () => {
    const limit = await service._minBuyAmount('WETH', 'DAI', '0.01');
    expect(limit.toString()).toEqual('490000000000000');
  });

  test('get pay amount', async () => {
    const payAmount = await service.getPayAmount('DAI', 'WETH', '0.01');
    expect(Object.keys(payAmount)).toEqual(['_bn']);
    expect(payAmount.toString()).toEqual('200000000000000000');
  });

  test('get maxPayAmount', async () => {
    const limit = await service._maxPayAmount('DAI', 'WETH', '0.01');
    expect(limit.toString()).toEqual('204000000000000000');
  });
});

describe('trade with existing dsproxy', () => {
  beforeEach(async () => {
    if (!proxyAccount) {
      proxyAccount = TestAccountProvider.nextAccount();
    }
    await setProxyAccount(service, proxyAccount);
    if (!(await proxy())) await service.get('proxy').build();
    await createDaiAndPlaceLimitOrder(service);
  });

  describe('sell', () => {
    test('sell all amount', async () => {
      const order = await service.sell('DAI', 'WETH', '0.01');
      expect(order.fees().toNumber()).toEqual(0.00330602);
    });

    test('sell all amount, buy eth', async () => {
      const order = await service.sell('DAI', 'ETH', '0.01');
      expect(order.fees().toNumber()).toEqual(0.00299192);
    });

    test('sell all amount, pay eth', async () => {
      await createDaiAndPlaceLimitOrder(service, true);
      const order = await service.sell('ETH', 'DAI', '0.01');
      expect(order.fees().toNumber()).toEqual(0.00328326);
    });
  });

  describe('buy', () => {
    test('buy all amount', async () => {
      const order = await service.buy('WETH', 'DAI', '0.01');
      expect(order.fees().toNumber()).toEqual(0.0029793);
    });

    test('buy all amount, buy eth', async () => {
      const order = await service.buy('ETH', 'DAI', '0.01');
      expect(order.fees().toNumber()).toEqual(0.0031075);
    });

    test('buy all amount, pay eth', async () => {
      await createDaiAndPlaceLimitOrder(service, true);
      const order = await service.buy('DAI', 'ETH', '0.01');
      expect(order.fees().toNumber()).toEqual(0.0033444);
    });
  });
});

describe('create dsproxy and execute', () => {
  beforeEach(async () => {
    const accountService = service.get('web3').get('accounts');
    await createDaiAndPlaceLimitOrder(service);
    await setNewAccount(accountService);
  });

  test('sell all amount, pay eth', async () => {
    await createDaiAndPlaceLimitOrder(service, true);
    const order = await service.sell('ETH', 'DAI', '0.01');
    expect(order.fees().toNumber()).toEqual(0.0143975);
  });

  test('buy all amount, pay eth', async () => {
    await createDaiAndPlaceLimitOrder(service, true);
    const order = await service.buy('DAI', 'ETH', '0.01');
    expect(order.fees().toNumber()).toEqual(0.01446508);
  });
});
