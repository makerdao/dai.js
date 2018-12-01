import { buildTestService } from '../../helpers/serviceBuilders';
import createDaiAndPlaceLimitOrder from '../../helpers/oasisHelpers';
import { setProxyAccount, transferMkr } from '../../helpers/proxyHelpers';
import TestAccountProvider from '../../helpers/TestAccountProvider';
import addresses from '../../../contracts/addresses/testnet.json';

let service, proxyAccount;

// The testnet seems to have deployed without
// minting MKR? For some reason, default account
// has none.

async function buildTestOasisDirectService() {
  service = buildTestService('oasisDirect', {
    oasisDirect: true,
    exchange: 'OasisExchangeService'
  });
  await service.manager().authenticate();
}

async function proxy() {
  return await service.get('proxy').currentProxy();
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

describe('trade with existing dsproxy', () => {
  beforeEach(async () => {
    if (!proxyAccount) {
      proxyAccount = TestAccountProvider.nextAccount();
    }
    await transferMkr(service, proxyAccount.address);
    await setProxyAccount(service, proxyAccount.address, proxyAccount.key);
    if (!(await proxy())) await service.get('proxy').build();
  });

  test('sell all amount', async () => {
    await createDaiAndPlaceLimitOrder(service.get('exchange'));
    try {
      console.log(await service.sellAllAmount('MKR', 'DAI', 1));
    } catch (err) {
      console.error(err);
    }
  });
});

describe('create and execute', () => {});
