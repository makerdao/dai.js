import contracts from '../../../contracts/contracts';
import { buildTestService } from '../../helpers/serviceBuilders';
import { DAI, ETH, WETH } from '../../../src/eth/Currency';
import createDaiAndPlaceLimitOrder from '../../helpers/oasisHelpers';

let oasisExchangeService;

async function buildTestOasisExchangeService() {
  oasisExchangeService = buildTestService('exchange', {
    exchange: 'OasisExchangeService'
  });
  await oasisExchangeService.manager().authenticate();
  return oasisExchangeService;
}

test('sell Dai, console log the balances (used for debugging)', async done => {
  const oasisExchangeService = await buildTestOasisExchangeService();
  let order;
  /* eslint-disable-next-line */
  let initialBalance;
  /* eslint-disable-next-line */
  let finalBalance;
  let daiToken;

  return createDaiAndPlaceLimitOrder(oasisExchangeService)
    .then(() => {
      const oasisContract = oasisExchangeService
        .get('smartContract')
        .getContractByName(contracts.MAKER_OTC);
      return oasisContract.getBestOffer(
        '0x7ba25f791fa76c3ef40ac98ed42634a8bc24c238',
        '0xc226f3cd13d508bc319f4f4290172748199d6612'
      );
    })
    .then(() => {
      const ethereumTokenService = oasisExchangeService.get('token');
      daiToken = ethereumTokenService.getToken(DAI);
      return daiToken.balanceOf(
        oasisExchangeService.get('web3').currentAccount()
      );
    })
    .then(balance => {
      initialBalance = balance;
      const wethToken = oasisExchangeService.get('token').getToken(WETH);
      return wethToken.balanceOf(
        oasisExchangeService.get('web3').currentAccount()
      );
    })
    .then(() => {
      const oasisContract = oasisExchangeService
        .get('smartContract')
        .getContractByName(contracts.MAKER_OTC);
      return daiToken.approveUnlimited(oasisContract.address).onMined();
    })
    .then(() => {
      const oasisContract = oasisExchangeService
        .get('smartContract')
        .getContractByName(contracts.MAKER_OTC);
      return daiToken.allowance(
        oasisExchangeService.get('web3').currentAccount(),
        oasisContract.address
      );
    })
    .then(() => {
      order = oasisExchangeService.sellDai('0.01', WETH);
      return order;
    })
    .then(() => {
      const ethereumTokenService = oasisExchangeService.get('token');
      const token = ethereumTokenService.getToken(WETH);
      return token.balanceOf(oasisExchangeService.get('web3').currentAccount());
    })
    .then(() => {
      const ethereumTokenService = oasisExchangeService.get('token');
      const token = ethereumTokenService.getToken(DAI);
      return token.balanceOf(oasisExchangeService.get('web3').currentAccount());
    })
    .then(balance => {
      finalBalance = balance;
      done();
    });
});

test('sell Dai', async () => {
  const oasisExchangeService = await buildTestOasisExchangeService();
  await createDaiAndPlaceLimitOrder(oasisExchangeService);
  const order = await oasisExchangeService.sellDai('0.01', WETH);
  expect(order.fees().gt(ETH.wei(80000))).toBeTruthy();
  expect(order.fillAmount()).toEqual(WETH(0.0005));
});

test('buy Dai', async () => {
  const oasisService = await buildTestOasisExchangeService();
  await createDaiAndPlaceLimitOrder(oasisService, true);
  const order = await oasisService.buyDai('0.01', WETH);
  expect(order.fees().gt(ETH.wei(80000))).toBeTruthy();
  expect(order.fillAmount()).toEqual(DAI(0.04));
});

test('buy Dai with wei amount', async () => {
  const oasisService = await buildTestOasisExchangeService();
  await createDaiAndPlaceLimitOrder(oasisService, true);
  const order = await oasisService.buyDai(DAI.wei(10000000000000000), WETH);
  expect(order.fees().gt(ETH.wei(80000))).toBeTruthy();
  expect(order.fillAmount()).toEqual(DAI(0.04));
});

/* commenting out until we fix explicit state transations for order objects
test('OasisOrder properly finalizes', done => {
  const oasisService = buildTestOasisExchangeService();
  let order = null;
  let daiToken = null;
  let randomAddress = TestAccountProvider.nextAddress();
  let order = null;
  oasisService.manager().authenticate()
    .then(() => {
      return createDaiAndPlaceLimitOrder(oasisService);
    })
    .then(() => {
      daiToken = oasisService.get('token').getToken(tokens.DAI);
      const oasisContract = oasisService.get('smartContract').getContractByName(contracts.MAKER_OTC);
      return daiToken.approveUnlimited(oasisContract.address).onMined();
    })
    .then(() => {
      order = oasisService.sellDai('0.01', tokens.WETH);
      order = order;
      return order.onPending();
    })
    .then(OrderObject => {
      expect(OrderObject._hybrid.getOriginalTransaction().state()).toBe(TransactionState.pending);
      return OrderObject._hybrid.onMined();
    })
    .then(OrderObject => {
      expect(OrderObject._hybrid.getOriginalTransaction().state()).toBe(TransactionState.mined);
      daiToken = oasisService.get('token').getToken(tokens.DAI);
      return daiToken.approveUnlimited(randomAddress).onMined();
    })
    .then(() => {
      return daiToken.approveUnlimited(randomAddress).onMined();
    })
    .then(() => {
      return daiToken.approveUnlimited(randomAddress).onMined();
    })
    .then(() => {
      return daiToken.approveUnlimited(randomAddress).onMined();
    })
    .then(() => {
      return order.onFinalized();
    })
    .then(OrderObject => {
      expect(OrderObject._hybrid.getOriginalTransaction().state()).toBe(TransactionState.finalized);
      done();
    });
});
*/
