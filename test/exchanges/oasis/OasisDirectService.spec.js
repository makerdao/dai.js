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

// If you just set your private key to the kovan key,
// the following will work for read operations only
// (protecting from violating the trading blackout),
// plus you can easily switch it to kovan for testing

// beforeAll(async () => {
//   maker = Maker.create('mainnet', {
//     privateKey: process.env.PRIVATE_KEY,
//     exchange: 'OasisDirectService'
//   });
//   await maker.authenticate();
// });

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

test('get buy amount', async () => {
  setMockTradeState();
  try {
    await createDaiAndPlaceLimitOrder(service);
  } catch (err) {
    console.error(err);
  }
  const buyAmount = await service.getBuyAmount();
  expect(Object.keys(buyAmount)).toEqual(['_bn']);
});

// Unskip this and uncomment lines 30-36 to see
// the amounts returned from the mainnet otc
xtest('amounts on mainnet', async () => {
  const exchange = maker.service('exchange');
  exchange._operation = 'sellAllAmount';
  setMockTradeState(exchange);
  const buyAmount = await exchange.getBuyAmount();
  console.log(ETH.wei(buyAmount).toNumber());
  const minBuyAmount = await exchange._minBuyAmount(buyAmount);
  console.log(ETH.wei(minBuyAmount).toNumber());
  console.log(minBuyAmount);
});

test('get pay amount', async () => {
  setMockTradeState();
  await createDaiAndPlaceLimitOrder(service);
  const payAmount = await service.getPayAmount();
  expect(Object.keys(payAmount)).toEqual(['_bn']);
});

test('get minBuyAmount (limit)', async () => {
  service._operation = 'sellAllAmount';
  setMockTradeState();
  await createDaiAndPlaceLimitOrder(service);
  const limit = await service._minBuyAmount();
  // console.log(limit);
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
  test.only('sell all amount', async () => {
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
      tx = await service.sell('DAI', 'WETH', '0.01');
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
