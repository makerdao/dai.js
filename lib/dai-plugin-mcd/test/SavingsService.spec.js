import { mcdMaker, setupCollateral } from './helpers';
import { ServiceRoles } from '../src/constants';
import BigNumber from 'bignumber.js'
import { MDAI, ETH } from '../src/index';
import { stringToBytes } from '../src/utils';

let service, maker

beforeAll(async () => {
  maker = await mcdMaker();
  service = maker.service(ServiceRoles.SAVINGS);
});

test('get dai savings rate', async () => {
  const dsr = await service.getDaiSavingsRate();

  expect(maker.service('web3')._web3.utils.isBigNumber(dsr)).toBe(true);
});

test('check amount in balance', async () => {
  const amount = await service.balance(maker.currentAddress())
  expect(amount.toNumber()).toBe(0)
});

test('join and exit pot', async () => {
  const vat = maker.service('smartContract').getContract('MCD_VAT')
  const potAddress = maker.service('smartContract').getContractAddress('MCD_POT')
  await vat.hope(potAddress)

  const amountBeforeJoin = await service.balance(maker.currentAddress())
  expect(amountBeforeJoin.toNumber()).toBe(0)

  await service.join(MDAI(1))
  const amountAfterJoin = await service.balance(maker.currentAddress())
  expect(amountAfterJoin.toNumber()).toBe(1)

  await service.exit(MDAI(1))
  const amountAfterExit = await service.balance(maker.currentAddress())
  expect(amountAfterExit).toBe(0)
});
