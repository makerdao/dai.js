import { buildTestService } from '../../helpers/serviceBuilders';
import createDaiAndPlaceLimitOrder from '../../helpers/oasisHelpers';

// Extract proxy helpers
// Set new proxy account
// Build new proxy

let service;

async function buildTestOasisDirectService() {
  service = buildTestService('oasisDirect', {
    oasisDirect: true,
    exchange: 'OasisExchangeService'
  });
  await service.manager().authenticate();
}

beforeEach(async () => {
  await buildTestOasisDirectService();
});

test('get token addresses', () => {});

// test('get token balances', async () => {
//   const balance = await service.getBalance(weth);
//   expect(balance.toString()).toEqual('0.00 WETH');
// });

test('sell all amount', async () => {
  await createDaiAndPlaceLimitOrder(service.get('exchange'));
  try {
    console.log(await service.sellAllAmount('MKR', 'DAI', 1));
  } catch (err) {
    console.error(err);
  }
});
