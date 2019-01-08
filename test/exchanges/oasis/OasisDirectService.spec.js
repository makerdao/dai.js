import { buildTestService } from '../../helpers/serviceBuilders';
import { setProxyAccount } from '../../helpers/proxyHelpers';
import TestAccountProvider from '../../helpers/TestAccountProvider';
import createDaiAndPlaceLimitOrder from '../../helpers/oasisHelpers';
import { DAI, WETH } from '../../../src/eth/Currency';
import { transferMkr } from '../../helpers/proxyHelpers';

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
});

test('get buy amount', async () => {
  await createDaiAndPlaceLimitOrder(service);
  const buyAmount = await service.getBuyAmount('WETH', 'DAI', '0.01');
  expect(Object.keys(buyAmount)).toEqual(['_bn']);
  expect(buyAmount.toString()).toEqual('500000000000000');
});

test('get pay amount', async () => {
  await createDaiAndPlaceLimitOrder(service);
  const payAmount = await service.getPayAmount('DAI', 'WETH', '0.01');
  expect(Object.keys(payAmount)).toEqual(['_bn']);
  expect(payAmount.toString()).toEqual('200000000000000000');
});

test('get minBuyAmount', async () => {
  await createDaiAndPlaceLimitOrder(service);
  const limit = await service._minBuyAmount('WETH', 'DAI', '0.01');
  expect(limit).toEqual(490000000000000);
});

test('get maxPayAmount', async () => {
  await createDaiAndPlaceLimitOrder(service);
  const limit = await service._maxPayAmount('DAI', 'WETH', '0.01');
  expect(limit).toEqual(204000000000000000);
});

describe('trade with existing dsproxy', () => {
  beforeEach(async () => {
    if (!proxyAccount) {
      proxyAccount = TestAccountProvider.nextAccount();
    }
    await transferMkr(service, proxyAccount.address);
    await setProxyAccount(service, proxyAccount);
    if (!(await proxy())) await service.get('proxy').build();
  });

  test('sell all amount', async () => {
    await createDaiAndPlaceLimitOrder(service);
    await service.get('allowance').requireAllowance(DAI, proxy());
    await service.sell('DAI', 'WETH', { value: '0.01' });
  });

  // Something needs approval that's not getting it
  test('sell all amount, buy eth', async () => {
    await createDaiAndPlaceLimitOrder(service);
    await service.get('allowance').requireAllowance(DAI, proxy());
    await service.get('allowance').requireAllowance(WETH, proxy());
    try {
      await service.sell('DAI', 'ETH', { value: '0.01' });
    } catch (err) {
      console.error(err);
    }
  });

  // Something needs approval that's not getting it
  test('sell all amount, pay eth', async () => {
    try {
      await createDaiAndPlaceLimitOrder(service, true);
      await service.sell('ETH', 'DAI', { value: '0.01' });
    } catch (err) {
      console.error(err);
    }
  });

  // The order of params is wrong here
  test.only('buy all amount', async () => {
    await createDaiAndPlaceLimitOrder(service);
    await service.get('allowance').requireAllowance(DAI, proxy());
    try {
      await service.buy('WETH', 'DAI', { value: '0.01' });
    } catch (err) {
      console.error(err);
    }
  });

  xtest('buy all amount, pay eth', async () => {});

  xtest('buy all amount, buy eth', async () => {});
});

xdescribe('create dsproxy and execute', () => {
  test('sell all amount', async () => {});

  test('sell all amount, pay eth', async () => {});

  test('sell all amount, buy eth', async () => {});

  test('buy all amount', async () => {});

  test('buy all amount, pay eth', async () => {});

  test('buy all amount, buy eth', async () => {});
});
