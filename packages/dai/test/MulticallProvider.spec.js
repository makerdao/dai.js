import Maker from '../src/index';
import {
  mineBlocks
} from '@makerdao/test-helpers';

let maker;

beforeAll(async () => {
  maker = await Maker.create('test', {
    web3: {
      pollingInterval: 100
    },
    multicall: true,
    price: true,
    log: true
  });
  await maker.authenticate();
});

test('lookup multiple values', async () => {
  const price = maker.service('price');

  // Testing MulticallProvider intercepting early block polling by Web3ProviderEngine's block tracker (eth-block-tracker)
  // await mineBlocks(price, 1);

  const price1_ = price.getEthPrice();
  const price2_ = price.getPethPrice();
  const price3_ = price.getMkrPrice();
  const [price1, price2, price3] = await Promise.all([price1_, price2_, price3_]);

  expect(price1.toBigNumber().toString()).toEqual('400');
  expect(price2.toBigNumber().toString()).toEqual('400');
  expect(price3.toBigNumber().toString()).toEqual('1040.492291525');

  const price4_ = price.getEthPrice();
  const price5_ = price.getPethPrice();
  const price6_ = price.getMkrPrice();
  const [price4, price5, price6] = await Promise.all([price4_, price5_, price6_]);

  expect(price4.toBigNumber().toString()).toEqual('400');
  expect(price5.toBigNumber().toString()).toEqual('400');
  expect(price6.toBigNumber().toString()).toEqual('1040.492291525');
});
