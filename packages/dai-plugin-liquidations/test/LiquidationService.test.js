import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import Maker from '@makerdao/dai';
import { McdPlugin, WSTETH } from '@makerdao/dai-plugin-mcd';
import BigNumber from 'bignumber.js';
import liquidationPlugin from '../src';
import LiquidationService, {
  RAD,
  WAD,
  RAY,
  stringToBytes
} from '../src/LiquidationService';
import { createVaults, setLiquidationsApprovals, getLockAmount } from './utils';

const me = '0x16fb96a5fa0427af0c8f7cf1eb4870231c8154b6';

//currently this test suite tests one ilk.  change the below values to test a different ilk
const ilk = 'WSTETH-A';
const token = WSTETH;
const ilkBalance = 10000; // Testchain faucet drops tokens into the account ahead of time.
const amtToBid = '0.005'; // A fraction of the available auction collateral

let service, cdpManager, network, maker, snapshotData;

const goerliConfig = {
  plugins: [liquidationPlugin, [McdPlugin, { network }]],
  accounts: {
    owner: {
      type: 'privateKey',
      key: '0x474beb999fed1b3af2ea048f963833c686a0fba05f5724cb6417cf3b8ee9697e'
    }
  },
  web3: {
    transactionSettings: {
      gasPrice: 1000000000 // 1 gwei all day
    },
    provider: { infuraProjectId: '992c66ef9bcf438aa47e45c789d3bd31' }
  }
};
const kovanConfig = {
  plugins: [liquidationPlugin, [McdPlugin, { network }]],
  accounts: {
    owner: {
      type: 'privateKey',
      key: '0x474beb999fed1b3af2ea048f963833c686a0fba05f5724cb6417cf3b8ee9697e'
    }
  },
  web3: {
    provider: { infuraProjectId: '406b22e3688c42898054d22555f43271' }
  }
};
const testchainConfig = {
  plugins: [
    [liquidationPlugin, { vulcanize: false }],
    [McdPlugin, { network: 'testchain' }]
  ],
  web3: {
    pollingInterval: 100
  }
};

async function makerInstance(preset) {
  const config =
    preset === 'kovan'
      ? kovanConfig
      : preset === 'goerli'
      ? goerliConfig
      : testchainConfig;
  const maker = await Maker.create(preset, config);
  await maker.authenticate();
  return maker;
}
describe('LiquidationService', () => {
  beforeAll(async () => {
    // To run this test on kovan, just switch the network variable below:
    // network = 'kovan';
    // network = 'goerli';
    network = 'testchain';

    const preset = network === 'testchain' ? 'test' : network;
    maker = await makerInstance(preset);
    service = maker.service('liquidation');
    cdpManager = maker.service('mcd:cdpManager');
    if (network === 'testchain') snapshotData = await takeSnapshot(maker);
  }, 60000);

  afterAll(async () => {
    if (network === 'testchain') await restoreSnapshot(snapshotData, maker);
  });

  test('can create liquidation service', async () => {
    expect(service).toBeInstanceOf(LiquidationService);
  });

  test('can bark an unsafe urn', async () => {
    // The setup to create a risky vault takes quite a long time on kovan
    const timeout =
      network === 'kovan' || network === 'goerli' ? 960000 : 120000;
    jest.setTimeout(timeout);

    // Opens a vault, withdraws DAI and calls drip until vault is unsafe.
    const vaultId = await createVaults(maker, network, ilk, token);

    const vaultUrnAddr = await cdpManager.getUrn(vaultId);
    const id = await service.bark(ilk, vaultUrnAddr);

    expect(id).toEqual(1);
  }, 480000);

  test('can join DAI to the vat', async () => {
    // Set up approvals
    await setLiquidationsApprovals(maker, ilk);
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
  }, 20000);

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
    const kicks = await service.kicks(ilk);
    expect(kicks.toString()).toEqual('1');
  });

  test('can get count from on chain', async () => {
    const count = await service.count(ilk);
    expect(count.toString()).toEqual('1');
  });

  test('can get status from on chain', async () => {
    const { needsRedo, price, lot, tab } = await service.getStatus(ilk, 1);

    const collateralAmount = new BigNumber(lot._hex).div(WAD);
    const daiNeeded = new BigNumber(tab._hex).div(RAD);

    expect(collateralAmount.gt(0)).toBe(true);
    expect(new BigNumber(price._hex).div(RAY).toString()).toEqual('19500');
    expect(daiNeeded.toNumber()).toBeCloseTo(1000);
    expect(needsRedo).toEqual(false);
  });

  test('can successfully bid on an auction', async () => {
    // We know the auction ID is 1 each time we run this test
    const id = 1;
    const max = '19500'; // Current YFI collateral price

    const usrVatGemBal2 = await maker
      .service('smartContract')
      .getContract('MCD_VAT')
      .gem(stringToBytes(ilk), me);

    // The user's vat gem balance before bidding should be 0
    expect(usrVatGemBal2.toString()).toEqual('0');

    await service.take(ilk, id, amtToBid, max, me);

    const usrVatGemBal3 = await maker
      .service('smartContract')
      .getContract('MCD_VAT')
      .gem(stringToBytes(ilk), me);

    // The balance after winning the bid is the amount bid.
    expect(usrVatGemBal3.toString()).toEqual(
      new BigNumber(amtToBid).times(WAD).toString()
    );
  });

  test('can claim collateral after winning an auction', async () => {
    const tokenContract = maker.getToken(token);
    const balanceBefore = (await tokenContract.balanceOf(me)).toNumber();

    // Collateral balance, minus the amount we locked in the vault
    const startingBalance = ilkBalance - getLockAmount(network, ilk);
    expect(balanceBefore).toEqual(startingBalance);

    const usrVatGemBal1 = await maker
      .service('smartContract')
      .getContract('MCD_VAT')
      .gem(stringToBytes(ilk), me);

    // The balance before exit should be the amount we won with 'take'.
    expect(usrVatGemBal1.toString()).toEqual(
      new BigNumber(amtToBid).times(WAD).toString()
    );

    await service.exitGemFromAdapter(ilk, amtToBid);

    const usrVatGemBal2 = await maker
      .service('smartContract')
      .getContract('MCD_VAT')
      .gem(stringToBytes(ilk), me);

    // The user's vat gem balance after exit should be 0
    expect(usrVatGemBal2.toString()).toEqual('0');

    const balanceAfter = (await tokenContract.balanceOf(me)).toBigNumber();

    // Collateral balance increased by the claim amount
    expect(balanceAfter).toEqual(new BigNumber(startingBalance).plus(amtToBid));
  });

  test('get unsafe LINK-A vaults', async () => {
    const urns = await service.getUnsafeVaults(['LINK-A', 'BAT-A']);
    console.log('urns', urns);
  }, 10000);

  test(`get all ${ilk} clips`, async () => {
    const clips = await service.getAllClips(ilk);
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

  test('getCusp', async () => {
    const cusp = await service.getCusp('LINK-A');
    console.log('cusp', cusp);
  }, 10000);
});
