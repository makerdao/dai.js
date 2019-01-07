import { buildTestService } from '../../helpers/serviceBuilders';
import { setProxyAccount } from '../../helpers/proxyHelpers';
import TestAccountProvider from '../../helpers/TestAccountProvider';
import addresses from '../../../contracts/addresses/testnet.json';
import createDaiAndPlaceLimitOrder from '../../helpers/oasisHelpers';
import Maker from '../../../src/index';
import { DAI, ETH, MKR, WETH } from '../../../src/eth/Currency';
import { transferMkr } from '../../helpers/proxyHelpers';
import { OasisSellOrder } from '../../../src/exchanges/oasis/OasisOrder';

let service, proxyAccount, maker;

async function buildTestOasisDirectService() {
  service = buildTestService('exchange', {
    exchange: 'OasisDirectService'
  });
  await service.manager().authenticate();
}

function proxy() {
  return service.get('proxy').currentProxy();
}

function setMockTradeState(exchange = service) {
  exchange._payToken = 'DAI';
  exchange._buyToken = 'WETH';
  exchange._value = 1;
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
    // await service
    //   .get('token')
    //   .getToken(tokens.WETH)
    //   .deposit(20);
    if (!(await proxy())) await service.get('proxy').build();
    await createDaiAndPlaceLimitOrder(service);
  });

  // I'm focusing on making this one work first
  test('sell all amount', async () => {
    // await createDaiAndPlaceLimitOrder(service);
    await service.get('allowance').requireAllowance(DAI, proxy());
    const dai = service.get('token').getToken('DAI');
    const mkr = service.get('token').getToken('MKR');
    const weth = service.get('token').getToken('WETH');
    const otc = service.get('smartContract').getContractByName('MAKER_OTC');
    let tx;
    try {
      const daiBalance = await dai.balanceOf(
        service.get('web3').currentAccount()
      );
      const mkrBalance = await mkr.balanceOf(
        service.get('web3').currentAccount()
      );
      // await dai.transfer(proxy(), '0.01');
      // tx = await OasisSellOrder.build(
      //   otc,
      //   'sellAllAmount',
      //   [dai.address(), service._valueForContract('0.01'), weth.address(), service._valueForContract('0')],
      //   service.get('transactionManager'),
      //   WETH
      // );
      tx = await service.sell('DAI', 'WETH', { value: '0.01' });
      // tx = await service.sellAllAmount('DAI', 'MKR', '0.01');
      // tx = await otc.sellAllAmount(dai.address(), service._valueForContract(0.01, 'eth'), weth.address(), service._valueForContract(0, 'eth') );
    } catch (err) {
      console.error(err);
    }
  });

  xtest(
    'sell all amount, pay eth',
    async () => {
      await maker
        .service('exchange')
        .sellAllAmountPayEth('DAI', 1, { value: 1 });
    },
    2000000
  );

  xtest('sell all amount, buy eth', async () => {
    await maker.service('exchange').sellAllAmountBuyEth('DAI', DAI(0.1));
  });

  xtest('buy all amount', async () => {
    await service.buyAllAmount('DAI', 'MKR', 20);
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
