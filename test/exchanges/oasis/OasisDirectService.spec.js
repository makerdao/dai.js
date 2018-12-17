import { buildTestService } from '../../helpers/serviceBuilders';
import { setProxyAccount } from '../../helpers/proxyHelpers';
import TestAccountProvider from '../../helpers/TestAccountProvider';
import addresses from '../../../contracts/addresses/testnet.json';
import tokens from '../../../contracts/tokens';
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

function setMockTradeState() {
  service._payToken = 'DAI';
  service._buyToken = 'WETH';
  service._value = 10;
}

beforeEach(async () => {
  await buildTestOasisDirectService();
});

test('get token addresses', () => {
  expect(service._getContractAddress('MKR')).toEqual(addresses.GOV);
  expect(service._getContractAddress('WETH')).toEqual(addresses.GEM);
  expect(service._getContractAddress('PETH')).toEqual(addresses.SKR);
  expect(service._getContractAddress('DAI')).toEqual(addresses.SAI);
  expect(service._getContractAddress('MKR_OTC')).toEqual(addresses.MKR_OTC);
});

test('get token balances', async () => {
  const balance = await service.getBalance('WETH');
  expect(balance.toString()).toEqual('0.00 WETH');
});

test('get buy amount', async () => {
  setMockTradeState();
  await createDaiAndPlaceLimitOrder(service);
  const buyAmount = await service.getBuyAmount();
  expect(Object.keys(buyAmount)).toEqual(['_bn']);
});

xtest('get pay amount', async () => {
  setMockTradeState();
  await createDaiAndPlaceLimitOrder(service, true);
  const payAmount = await service.getPayAmount();
  console.log('payAmount:', payAmount);
});

test('get minBuyAmount (limit)', async () => {
  service._operation = 'sellAllAmount';
  setMockTradeState();
  await createDaiAndPlaceLimitOrder(service);
  const limit = await service._limit();
  expect(Object.keys(limit)).toEqual(['_bn']);
});

xtest('get maxPayAmount (limit', async () => {
  setMockTradeState();
  await createDaiAndPlaceLimitOrder(service, true);
  const limit = await service._limit();
  expect(Object.keys(limit)).toEqual(['_bn']);
});

xdescribe('trade with existing dsproxy', () => {
  beforeEach(async () => {
    if (!proxyAccount) {
      proxyAccount = TestAccountProvider.nextAccount();
    }
    await setProxyAccount(service, proxyAccount.address, proxyAccount.key);
    await service
      .get('token')
      .getToken(tokens.WETH)
      .deposit(20);
    if (!(await proxy())) await service.get('proxy').build();
  });

  test('sell all amount', async () => {
    await service.sellAllAmount('WETH', 'DAI', 20);
  });

  test('sell all amount, pay eth', async () => {
    await service.sellAllAmountPayEth('DAI', 200, { value: 1 });
  });

  test('sell all amount, buy eth', async () => {});

  test('buy all amount', async () => {
    await service.buyAllAmount('DAI', 'MKR', 20);
  });

  test('buy all amount, pay eth', async () => {});

  test('buy all amount, buy eth', async () => {});
});

xdescribe('create dsproxy and execute', () => {
  test('sell all amount', async () => {});

  test('sell all amount, pay eth', async () => {});

  test('sell all amount, buy eth', async () => {});

  test('buy all amount', async () => {});

  test('buy all amount, pay eth', async () => {});

  test('buy all amount, buy eth', async () => {});
});
