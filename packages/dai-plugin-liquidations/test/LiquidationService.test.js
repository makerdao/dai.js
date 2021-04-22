import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import Maker from '@makerdao/dai';
import McdPlugin, { LINK } from '@makerdao/dai-plugin-mcd';
import BigNumber from 'bignumber.js';
import liquidationPlugin from '../src';
import LiquidationService, {
  RAD,
  WAD,
  RAY,
  stringToBytes
} from '../src/LiquidationService';
import { createVaults, setLiquidationsApprovals } from './utils';

const me = '0x16fb96a5fa0427af0c8f7cf1eb4870231c8154b6';
const ilk = 'LINK-A';

const kovanConfig = {
  plugins: [liquidationPlugin, [McdPlugin, { network }]],
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
  plugins: [liquidationPlugin, [McdPlugin, { network: 'testchain' }]],
  web3: {
    pollingInterval: 100
  }
};

let service, cdpManager, network, maker, snapshotData;

async function makerInstance(preset) {
  const config = preset === 'kovan' ? kovanConfig : testchainConfig;
  const maker = await Maker.create(preset, config);
  await maker.authenticate();
  return maker;
}

beforeAll(async () => {
  // To run this test on kovan, just switch the network variables below:
  // network = 'kovan';
  network = 'test';
  maker = await makerInstance(network);
  service = maker.service('liquidation');
  cdpManager = maker.service('mcd:cdpManager');
  if (network === 'test') snapshotData = await takeSnapshot(maker);
}, 60000);

afterAll(async () => {
  if (network === 'test') await restoreSnapshot(snapshotData, maker);
});

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
  const id = await service.bark(ilk, vaultUrnAddr);

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
  await service.joinDaiToAdapter(joinAmt);

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

test('can exit DAI from the vat', async () => {
  const vatDaiBalBefore = await maker
    .service('smartContract')
    .getContract('MCD_VAT')
    .dai(maker.currentAddress());

  const exitAmt = 5;
  await service.exitDaiFromAdapter(exitAmt);

  const vatDaiBalAfter = await maker
    .service('smartContract')
    .getContract('MCD_VAT')
    .dai(maker.currentAddress());

  expect(vatDaiBalAfter).toEqual(
    vatDaiBalBefore.sub(
      BigNumber(exitAmt)
        .times(RAD)
        .toFixed()
    )
  );
});

test('can get kicks from on chain', async () => {
  const kicks = await service.kicks();
  expect(kicks.toString()).toEqual('1');
});

test('can get count from on chain', async () => {
  const count = await service.count();
  expect(count.toString()).toEqual('1');
});

test('can get status from on chain', async () => {
  const { needsRedo, price, lot, tab } = await service.getStatus(1);

  const collateralAmount = new BigNumber(lot).div(WAD).toString();
  const daiNeeded = new BigNumber(tab).div(RAD);

  expect(collateralAmount).toEqual('25');
  expect(new BigNumber(price).div(RAY).toString()).toEqual('13.5');
  expect(daiNeeded.toNumber()).toBeCloseTo(135);
  expect(needsRedo).toEqual(false);
});

test('can successfully bid on an auction', async () => {
  // We know the vault ID is 1 each time we run this test
  const id = 1;
  const amt = '1';
  const max = '20';

  const usrVatGemBal2 = await maker
    .service('smartContract')
    .getContract('MCD_VAT')
    .gem(stringToBytes(ilk), me);

  // The user's vat gem balance before bidding should be 0
  expect(usrVatGemBal2.toString()).toEqual('0');

  await service.take(id, amt, max, me);

  const usrVatGemBal3 = await maker
    .service('smartContract')
    .getContract('MCD_VAT')
    .gem(stringToBytes(ilk), me);

  // The balance after winning the bid is the amount bid.
  expect(usrVatGemBal3.toString()).toEqual(
    new BigNumber(amt).times(WAD).toString()
  );
});

test('can claim collateral after winning an auction', async () => {
  const amt = 1;

  const linkToken = await maker.getToken(LINK);

  const linkBalanceBefore = (await linkToken.balanceOf(me)).toNumber();

  // Starting balance of 1000, minus the 25 we locked in the vault
  const startingBalance = 9975;
  expect(linkBalanceBefore).toEqual(startingBalance);

  const usrVatGemBal1 = await maker
    .service('smartContract')
    .getContract('MCD_VAT')
    .gem(stringToBytes(ilk), me);

  // The balance before exit should be the amount we won with 'take'.
  expect(usrVatGemBal1.toString()).toEqual(
    new BigNumber(amt).times(WAD).toString()
  );

  await service.exitGemFromAdapter(ilk, amt);

  const usrVatGemBal2 = await maker
    .service('smartContract')
    .getContract('MCD_VAT')
    .gem(stringToBytes(ilk), me);

  // The user's vat gem balance after exit should be 0
  expect(usrVatGemBal2.toString()).toEqual('0');

  const linkBalanceAfter = (await linkToken.balanceOf(me)).toNumber();

  // Link balanced increased by the claim amount
  expect(linkBalanceAfter).toEqual(startingBalance + amt);
});

test('get unsafe LINK-A vaults', async () => {
  const urns = await service.getUnsafeVaults('LINK-A');
  console.log('urns', urns);
}, 10000);

test('get all LINK-A clips', async () => {
  const clips = await service.getAllClips('LINK-A');
  console.log('clips', clips);
}, 10000);

test('get all LINK-A clips without vulcanize', async () => {
  const clips = await service.getAllClips('LINK-A', { vulcanize: false });
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
