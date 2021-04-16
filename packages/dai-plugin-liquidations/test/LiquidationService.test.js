import Maker from '@makerdao/dai';
import McdPlugin from '@makerdao/dai-plugin-mcd';
import BigNumber from 'bignumber.js';
import liquidationPlugin from '../src';
import LiquidationService, { RAD } from '../src/LiquidationService';
import { createVaults, setLiquidationsApprovals } from './utils';

// const MCD_CLIP_LINK_A = '0x1eB71cC879960606F8ab0E02b3668EEf92CE6D98'; // kovan
// const MCD_JOIN_DAI = '0x5AA71a3ae1C0bd6ac27A1f28e1415fFFB6F15B8c'; //kovan

// const MCD_CLIP_LINK_A = '0xc84b50Ea1cB3f964eFE51961140057f7E69b09c1'; //testchain
// const MCD_JOIN_DAI = '0xe53793CA0F1a3991D6bfBc5929f89A9eDe65da44'; //testchain

const kovanConfig = {
  plugins: [[liquidationPlugin], [McdPlugin, { network }]],
  accounts: {
    owner: {
      type: 'privateKey',
      key: '0x474beb999fed1b3af2ea048f963833c686a0fba05f5724cb6417cf3b8ee9697e'
    }
  },
  web3: {
    provider: { infuraProjectId: 'c3f0f26a4c1742e0949d8eedfc47be67' }
  }
};
const testchainConfig = {
  plugins: [[liquidationPlugin], [McdPlugin, { network: 'testchain' }]],
  web3: {
    pollingInterval: 100
  }
};

let service, cdpManager, network, maker;

async function makerInstance(preset) {
  const config = preset === 'kovan' ? kovanConfig : testchainConfig;
  const maker = await Maker.create(preset, config);
  await maker.authenticate();
  return maker;
}

beforeAll(async () => {
  // To run this test on kovan, just switch the network variables below
  // network = 'kovan';
  network = 'test';
  maker = await makerInstance(network);
  service = maker.service('liquidation');
  cdpManager = maker.service('mcd:cdpManager');
}, 60000);

test('can create liquidation service', async () => {
  expect(service).toBeInstanceOf(LiquidationService);
});

test('can bark an unsafe urn', async () => {
  // The setup to create a risky vault takes quite a long time on kovan
  const timeout = network === 'kovan' ? 480000 : 120000;
  jest.setTimeout(timeout);

  // Opens a vault, withdraws DAI and calls drip until vault is unsafe.
  const vaultId = await createVaults(
    maker,
    network === 'test' ? 'testchain' : network
  );

  const vaultUrnAddr = await cdpManager.getUrn(vaultId);
  const id = await service.bark('LINK-A', vaultUrnAddr);

  expect(id).toEqual(1);
});

test('can join DAI to the vat', async () => {
  // Set up approvals
  await setLiquidationsApprovals(maker);

  const vatDaiBalBefore = await maker
    .service('smartContract')
    .getContract('MCD_VAT')
    .dai(maker.currentAddress());

  const joinAmt = 80;
  await service.joinDaiToAdapter(maker.currentAddress(), joinAmt);

  const vatDaiBalAfter = await maker
    .service('smartContract')
    .getContract('MCD_VAT')
    .dai(maker.currentAddress());

  expect(vatDaiBalAfter).toEqual(
    vatDaiBalBefore.add(
      BigNumber(joinAmt)
        .times(RAD)
        .toFixed()
    )
  );
});

xtest('can successfully bid on an auction', async () => {
  // // const id =
  // //   '0x000000000000000000000000000000000000000000000000000000000000000f';
  // const id = await liquidateVaults(maker, vaultId);
  // console.log('ID:', id);
  // // await mineBlocks(maker.service('web3'), 10);
  // // const id = 1;
  // // const amt = '1';
  // // const max = '3.99999999999999999999';
  // // const max = '20';
  // try {
  //   const kicks = await service.kicks();
  //   console.log('KICKS:', kicks.toString());
  //   // const active = await service.active(0);
  //   // console.log('ACTIVE', active.toString());
  //   // const sales = await service.sales(id);
  //   // console.log(
  //   //   'SALES',
  //   //   sales.pos.toString(),
  //   //   sales.tab.toString(),
  //   //   sales.lot.toString(),
  //   //   sales.usr.toString(),
  //   //   sales.tic.toString(),
  //   //   sales.top.toString()
  //   // );
  //   const count = await service.count();
  //   console.log('COUNT', count.toString());
  //   const list = await service.list();
  //   console.log('LIST', list);
  //   // const status = await service.getStatus(id);
  //   // console.log(
  //   //   'STATUS',
  //   //   status.needsRedo,
  //   //   status.price.toString(),
  //   //   status.lot.toString(),
  //   //   status.tab.toString()
  //   // );
  //   // const txo = await service.take(id, amt, max, me);
  //   // console.log('called take', txo.receipt.logs);
  // } catch (e) {
  //   console.error('take error:', e);
  // }
  // // await mineBlocks(maker.service('web3'), 10);
  // // verify collateral was successfully moved to me after 'take'
  // const usrVatGemBal = await maker
  //   .service('smartContract')
  //   .getContract('MCD_VAT')
  //   .gem('0x4c494e4b2d41', me);
  // console.log('user vat gem bal', usrVatGemBal.toString());
  // const daiBal2 = await maker
  //   .service('smartContract')
  //   .getContract('MCD_VAT')
  //   .dai(maker.currentAddress());
  // console.log('vat dai balance after take', daiBal2.toString());
});

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

test('getHoleAndDirtForIlk for LINK-A', async () => {
  const holeAndDirt = await service.getHoleAndDirtForIlk('LINK-A');
  console.log('data', holeAndDirt);
}, 10000);

test('getHoleAndDirt', async () => {
  const holeAndDirt = await service.getHoleAndDirt();
  console.log('data', holeAndDirt);
}, 10000);

xtest('getChost', async () => {
  const chost = await service.getChost('LINK-A');
  console.log('chost', chost);
}, 10000);

test('getTail', async () => {
  const tail = await service.getTail('LINK-A');
  console.log('tail', tail);
}, 10000);
