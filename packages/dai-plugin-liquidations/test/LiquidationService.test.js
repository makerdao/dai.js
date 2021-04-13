import Maker from '@makerdao/dai';
import McdPlugin from '@makerdao/dai-plugin-mcd';
// import BigNumber from 'bignumber.js';
import liquidationPlugin from '../src';
import LiquidationService, { nullBytes } from '../src/LiquidationService';
import { createVaults, liquidateVaults } from '../test/utils';
import { mineBlocks } from '../../test-helpers/src';

// const infuraProjectId = 'c3f0f26a4c1742e0949d8eedfc47be67';

// const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// console.log('sleeping');
// await sleep(20000);

const urn = '0xB95fFDe0C48F23Df7401b1566C4DA0EDeEF604AC';
const me = '0x16fb96a5fa0427af0c8f7cf1eb4870231c8154b6';
const myProxy = '0x570074CCb147ea3dE2E23fB038D4d78324278886';

const MCD_CLIP_LINK_A = '0x1eB71cC879960606F8ab0E02b3668EEf92CE6D98'; // kovan
const MCD_JOIN_DAI = '0x5AA71a3ae1C0bd6ac27A1f28e1415fFFB6F15B8c'; //kovan

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

let service, network, maker;

async function makerInstance(preset) {
  const config = preset === 'kovan' ? kovanConfig : testchainConfig;
  const maker = await Maker.create(preset, config);
  await maker.authenticate();
  return maker;
}

beforeAll(async () => {
  network = 'kovan';
  // network = 'test';
  maker = await makerInstance(network);
  service = maker.service('liquidation');
}, 60000);

test('can create liquidation service', async () => {
  expect(service).toBeInstanceOf(LiquidationService);
});

xtest('can create risky vaults', async () => {
  // await createVaults(maker, 'kovan');

  console.log(
    'my dai balance',
    (await maker.getToken('DAI').balance()).toString()
  );

  try {
    //req to move dai from me to vat
    // const joinApproval = await maker
    //   .getToken('DAI')
    //   .approveUnlimited(MCD_JOIN_DAI);
    // console.log('join Approval', joinApproval);
    //req to manipulate my vat dai balance (to "pay" for take calls)
    // const hopedDj = await maker
    //   .service('smartContract')
    //   .getContract('MCD_VAT')
    //   .hope(MCD_JOIN_DAI);
    // console.log('gave hope to DJ', hopedDj.receipt.logs);
    // req for clipper to manipulate vat balance (req for each clipper)
    // const hoped = await maker
    //   .service('smartContract')
    //   .getContract('MCD_VAT')
    //   .hope(MCD_CLIP_LINK_A);
    // console.log('gave hope to clipper', hoped.receipt.logs);
  } catch (e) {
    console.error('errow with hope', e);
  }
  const vatDaiBalA = await maker
    .service('smartContract')
    .getContract('MCD_VAT')
    .dai(maker.currentAddress());
  console.log('vat dai balance before joining', vatDaiBalA.toString());

  // check the clipper's LINK balance to verify liquidated collateral was successfully moved into clipper
  const vatGemBal_ = await maker
    .service('smartContract')
    .getContract('MCD_VAT')
    .gem('0x4c494e4b2d41', MCD_CLIP_LINK_A);

  console.log('vat GEM bal', vatGemBal_.toString());

  // try {
  //   const jd = await service.joinDaiToAdapter(maker.currentAddress(), '80');
  //   console.log('joined dai', jd);
  // } catch (e) {
  //   console.error('error joining dai', e);
  // }

  const vatDaiBal = await maker
    .service('smartContract')
    .getContract('MCD_VAT')
    .dai(maker.currentAddress());
  console.log('vat dai balance before take', vatDaiBal.toString());

  const id =
    '0x000000000000000000000000000000000000000000000000000000000000000f';
  // const id = await liquidateVaults(maker);
  // console.log('ID:', id);
  // await mineBlocks(maker.service('web3'), 10);

  // const id = 1;
  const amt = '1';
  // const max = '3.99999999999999999999';
  const max = '20';
  // try {
  //   const kicks = await service.kicks();
  //   console.log('KICKS:', kicks.toString());

  //   const active = await service.active(2);
  //   console.log('ACTIVE', active.toNumber());

  //   const list = await service.list();
  //   console.log('LIST', list);

  //   const txo = await service.take(id, amt, max, me);
  //   console.log('called take', txo.receipt.logs);
  // } catch (e) {
  //   console.error('take error:', e);
  // }

  // await mineBlocks(maker.service('web3'), 10);

  // const sales = await service.sales(id);
  // console.log(
  //   'SALES (after "take"):',
  //   sales.pos.toString(),
  //   sales.tab.toString(),
  //   sales.lot.toString(),
  //   sales.usr.toString(),
  //   sales.tic.toString(),
  //   sales.top.toString()
  // );

  // verify collateral was successfully moved to me after 'take'
  const usrVatGemBal = await maker
    .service('smartContract')
    .getContract('MCD_VAT')
    .gem('0x4c494e4b2d41', me);

  console.log('user vat gem bal', usrVatGemBal.toString());

  // // const txMgr = maker.service('transactionManager');
  // // txMgr.listen(txo, {
  // //   pending: tx => console.log('pending', tx),
  // //   mined: tx => console.log('mined', tx)
  // // });

  //83445629784564465846456203674066237330069356252
  //83445629784564465846456203674066237330069356252

  const daiBal2 = await maker
    .service('smartContract')
    .getContract('MCD_VAT')
    .dai(maker.currentAddress());
  console.log('vat dai balance after take', daiBal2.toString());
}, 120000);

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
