import Maker from '@makerdao/dai';
import McdPlugin from '@makerdao/dai-plugin-mcd';
import liquidationPlugin from '../src';
import LiquidationService from '../src/LiquidationService';
import { createVaults } from './utils';

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

  // try {
  //   //req to move dai from me to vat
  //   // const joinApproval = await maker
  //   //   .getToken('DAI')
  //   //   .approveUnlimited(MCD_JOIN_DAI);
  //   // console.log('join Approval', joinApproval);
  //   //req to manipulate my vat dai balance (to "pay" for take calls)
  //   // const hopedDj = await maker
  //   //   .service('smartContract')
  //   //   .getContract('MCD_VAT')
  //   //   .hope(MCD_JOIN_DAI);
  //   // console.log('gave hope to DJ', hopedDj.receipt.logs);
  //   // req for clipper to manipulate vat balance (req for each clipper)
  //   // const hoped = await maker
  //   //   .service('smartContract')
  //   //   .getContract('MCD_VAT')
  //   //   .hope(MCD_CLIP_LINK_A);
  //   // console.log('gave hope to clipper', hoped.receipt.logs);
  // } catch (e) {
  //   console.error('errow with hope', e);
  // }
  // const vatDaiBalA = await maker
  //   .service('smartContract')
  //   .getContract('MCD_VAT')
  //   .dai(maker.currentAddress());
  // console.log('vat dai balance before joining', vatDaiBalA.toString());

  // // check the clipper's LINK balance to verify liquidated collateral was successfully moved into clipper
  // const vatGemBal_ = await maker
  //   .service('smartContract')
  //   .getContract('MCD_VAT')
  //   .gem('0x4c494e4b2d41', MCD_CLIP_LINK_A);

  // console.log('vat GEM bal', vatGemBal_.toString());

  // // try {
  // //   const jd = await service.joinDaiToAdapter(maker.currentAddress(), '80');
  // //   console.log('joined dai', jd);
  // // } catch (e) {
  // //   console.error('error joining dai', e);
  // // }

  // const vatDaiBal = await maker
  //   .service('smartContract')
  //   .getContract('MCD_VAT')
  //   .dai(maker.currentAddress());
  // console.log('vat dai balance before take', vatDaiBal.toString());

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

test('getHoleAndDirtForIlk', async () => {
  const data = await service.getHoleAndDirtForIlk('LINK-A');
  console.log('data', data);
}, 10000);

test('getHoleAndDirt', async () => {
  const data = await service.getHoleAndDirt();
  console.log('data', data);
}, 10000);

xtest('getChost', async () => {
  const chost = await service.getChost();
  console.log('data', chost);
}, 10000);
