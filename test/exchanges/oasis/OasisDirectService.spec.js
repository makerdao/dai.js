import { buildTestService } from '../../helpers/serviceBuilders';
import createDaiAndPlaceLimitOrder from '../../helpers/oasisHelpers';
import {
  setProxyAccount,
  setExistingAccount
} from '../../helpers/proxyHelpers';
import TestAccountProvider from '../../helpers/TestAccountProvider';
import addresses from '../../../contracts/addresses/testnet.json';
import tokens from '../../../contracts/tokens';

let service, proxyAccount;

// Error is happening on lockEth in oasisHelpers
// What denomination is the limit in? eth?
// What's the difference between buy and sell functions?
// What are the two defined limits in OD used for?

async function buildTestOasisDirectService() {
  service = buildTestService('oasisDirect', {
    oasisDirect: true,
    exchange: 'OasisExchangeService'
  });
  await service.manager().authenticate();
}

function proxy() {
  return service.get('proxy').currentProxy();
}

function setMockTradeState() {
  service._operation = 'sellAllAmount';
  service._payToken = 'DAI';
  service._buyToken = 'WETH';
  service._value = 1;
}

function currentAccount() {
  return service
    .get('smartContract')
    .get('web3')
    .currentAccount();
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
  await service.getBuyAmount();
});

describe('trade with existing dsproxy', () => {
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
    try {
      await createDaiAndPlaceLimitOrder(service.get('exchange'));
    } catch (err) {
      console.error(err);
    }
    await service.sellAllAmount('WETH', 'DAI', 20);
  });

  xtest('sell all amount, pay eth', async () => {
    try {
      await setExistingAccount(service.get('exchange'), 'default');
      await createDaiAndPlaceLimitOrder(service.get('exchange'));
      await setExistingAccount(proxyAccount.address);
    } catch (err) {
      console.error(err);
    }
    await service.sellAllAmountPayEth('DAI', 200, { value: 1 });
  });

  xtest('sell all amount, buy eth', async () => {});

  test('buy all amount', async () => {
    try {
      // This needs to be done here by calling oasis contract
      // directly
      await createDaiAndPlaceLimitOrder(service.get('exchange'), true);
    } catch (err) {
      console.error(err);
    }
    await service.buyAllAmount('DAI', 'MKR', 20);
  });

  xtest('buy all amount, pay eth', async () => {});

  xtest('buy all amount, buy eth', async () => {});
});

describe('create dsproxy and execute', () => {
  xtest('sell all amount', async () => {});

  xtest('sell all amount, pay eth', async () => {});

  xtest('sell all amount, buy eth', async () => {});

  xtest('buy all amount', async () => {});

  xtest('buy all amount, pay eth', async () => {});

  xtest('buy all amount, buy eth', async () => {});
});
