import { buildTestService } from '../../helpers/serviceBuilders';
import createDaiAndPlaceLimitOrder from '../../helpers/oasisHelpers';

let service, weth, dai, mkr;

async function buildTestOasisDirectService() {
  service = buildTestService('oasisDirect', {
    oasisDirect: true,
    exchange: 'OasisExchangeService'
  });
  await service.manager().authenticate();
}

beforeEach(async () => {
  await buildTestOasisDirectService();
  weth = service.get('token').getToken('WETH');
  dai = service.get('token').getToken('DAI');
  mkr = service.get('token').getToken('MKR');
});

test('get token addresses', () => {
  console.log(service._getTokenAddress('MKR'));
  console.log(service._getTokenAddress('WETH'));
  console.log(service._getTokenAddress('PETH'));
  console.log(service._getTokenAddress('DAI'));
});

test('get token balances', async () => {
  const balance = await service.getBalance(weth);
  expect(balance.toString()).toEqual('0.00 WETH');
});

xtest('sell all amount', async () => {
  await createDaiAndPlaceLimitOrder(service.get('exchange'));
  try {
    await service.sellAllAmount('MKR', 'DAI', 1);
  } catch (err) {
    console.error(err);
  }
});
