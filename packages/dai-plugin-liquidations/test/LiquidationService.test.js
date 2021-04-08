import Maker from '@makerdao/dai';
import McdPlugin from '@makerdao/dai-plugin-mcd';
// import BigNumber from 'bignumber.js';
import liquidationPlugin from '../src';
import LiquidationService from '../src/LiquidationService';
import { createVaults, liquidateVaults } from '../test/utils';
import { mineBlocks } from '../../test-helpers/src';

// const infuraProjectId = 'c3f0f26a4c1742e0949d8eedfc47be67';

// const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// console.log('sleeping');
// await sleep(20000);

const urn = '0xB95fFDe0C48F23Df7401b1566C4DA0EDeEF604AC';
const me = '0x16fb96a5fa0427af0c8f7cf1eb4870231c8154b6';

let service, network, maker;

async function makerInstance(preset) {
  const maker = await Maker.create(preset, {
    plugins: [[liquidationPlugin], [McdPlugin, { network: 'testchain' }]],
    web3: {
      pollingInterval: 100
      // provider: {
      //   infuraProjectId
      // }
    }
  });
  await maker.authenticate();
  return maker;
}

beforeAll(async () => {
  network = 'test';
  maker = await makerInstance(network);
  service = maker.service('liquidation');
}, 60000);

test.only('can create liquidation service', async () => {
  await createVaults(maker);

  console.log(
    'my dai balance',
    (await maker.getToken('DAI').balance()).toString()
  );

  try {
    // await maker.getToken('DAI').approveUnlimited(maker.currentAddress());

    await maker
      .getToken('DAI')
      .approveUnlimited('0xe53793CA0F1a3991D6bfBc5929f89A9eDe65da44');

    const jd = await service.joinDaiToAdapter(maker.currentAddress(), '102');
    console.log('joined dai', jd);
  } catch (e) {
    console.error(e);
  }

  const vatDaiBal = await maker
    .service('smartContract')
    .getContract('MCD_VAT')
    .dai(maker.currentAddress());
  console.log('vat dai balance before take', vatDaiBal.toString());

  await liquidateVaults(maker);
  await mineBlocks(maker.service('web3'), 10);

  const txo = await service.take(0, 102, 50, urn, me);
  // const txMgr = maker.service('transactionManager');
  // txMgr.listen(txo, {
  //   pending: tx => console.log('pending', tx),
  //   mined: tx => console.log('mined', tx)
  // });

  const daiBal2 = await maker
    .service('smartContract')
    .getContract('MCD_VAT')
    .dai(maker.currentAddress());
  console.log('vat dai balance after take', daiBal2.toString());

  console.log('txo', txo);

  expect(service).toBeInstanceOf(LiquidationService);
}, 30000);

test('get unsafe LINK-A vaults', async () => {
  const urns = await service.getUnsafeVaults('LINK-A');
  console.log('urns', urns);
}, 10000);

test('get all LINK-A clips', async () => {
  const clips = await service.getAllClips('LINK-A');
  console.log('clips', clips);
}, 10000);

test('get all dusts', async () => {
  const dusts = await service.getAllDusts();
  console.log('dusts', dusts);
}, 10000);

test('get price for LINK-A', async () => {
  const price = await service.getPrice('LINK-A');
  console.log('price', price);
}, 10000);

test('get clip contract', async () => {
  console.log('sales', await service._clipperContract().sales(11));
  console.log('status', await service._clipperContract().getStatus(0));
});
