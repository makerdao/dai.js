import {
  takeSnapshot,
  restoreSnapshot,
  mineBlocks,
  TestAccountProvider
} from '@makerdao/test-helpers';
import { mcdMaker, setupCollateral } from './helpers';
import { ServiceRoles } from '../src/constants';
import { MDAI, ETH } from '../src/index';
import BigNumber from 'bignumber.js';

let service, maker, dai, proxyAddress;

function calculateAccruedInterest(amount, chi1, chi2) {
  return chi2
    .times(amount)
    .minus(chi1.times(amount))
    .toNumber();
}

async function mineBlocksAndReturnChi(blocksToMine) {
  const chiBeforeTime = new BigNumber(await service._pot.chi()).shiftedBy(-27);

  await mineBlocks(maker.service('web3'), blocksToMine);
  await maker
    .service('smartContract')
    .getContract('MCD_POT')
    .drip();

  const chiAfterTime = new BigNumber(await service._pot.chi()).shiftedBy(-27);

  return [chiBeforeTime, chiAfterTime];
}

describe('Savings Service', () => {
  let snapshotData;

  async function makeSomeDai(amount) {
    const cdpMgr = await maker.service(ServiceRoles.CDP_MANAGER);
    await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
    await cdpMgr.openLockAndDraw('ETH-A', ETH(1), MDAI(amount));
  }

  beforeAll(async () => {
    maker = await mcdMaker();
    service = maker.service(ServiceRoles.SAVINGS);
    dai = maker.getToken(MDAI);
    proxyAddress = await maker.service('proxy').ensureProxy();
    await dai.approveUnlimited(proxyAddress);
  });

  afterAll(async () => {
    await maker.service('allowance').removeAllowance('MDAI', proxyAddress);
  });

  beforeEach(async () => {
    maker.service('accounts').useAccount('default');
    snapshotData = await takeSnapshot(maker);
  });

  afterEach(async () => {
    await restoreSnapshot(snapshotData, maker);
  });

  test('get dai savings rate', async () => {
    const dsr = await service.getYearlyRate();
    expect(dsr.toNumber()).toBe(1.0099999999998925);
  });

  test('get total amount of dai in pot', async () => {
    await makeSomeDai(3);
    const potTotalBeforeJoin = await service.getTotalDai();
    expect(potTotalBeforeJoin.toNumber()).toBe(0);

    await service.join(MDAI(2));

    const potTotalAfterJoin = await service.getTotalDai();
    expect(potTotalAfterJoin.toNumber()).toBe(2);
  });

  test('get total amount of dai in pot after some time', async () => {
    await makeSomeDai(3);
    const potTotalBeforeJoin = await service.getTotalDai();
    expect(potTotalBeforeJoin.toNumber()).toBe(0);

    const joinAmount = 2;
    await service.join(MDAI(joinAmount));

    const potTotalAfterJoin = await service.getTotalDai();
    expect(potTotalAfterJoin.toNumber()).toBe(2);

    const [chi1, chi2] = await mineBlocksAndReturnChi(3);
    const accruedInterest = calculateAccruedInterest(joinAmount, chi1, chi2);

    const potTotalAfterTime = await service.getTotalDai();
    expect(potTotalAfterTime.toNumber()).toBeCloseTo(
      joinAmount + accruedInterest,
      10
    );
  });

  test('check amount in balance', async () => {
    const amount = await service.balance();
    expect(amount.symbol).toBe('MDAI');
  });

  test('check amount using balance of', async () => {
    const proxyAddress = await maker.currentProxy();
    const amount = await service.balanceOf(proxyAddress);
    expect(amount.symbol).toBe('MDAI');
  });

  test('get balance without proxy', async () => {
    const { address, key } = TestAccountProvider.nextAccount();
    await maker
      .service('accounts')
      .addAccount(address, { type: 'privateKey', key });
    maker.service('accounts').useAccount(address);

    const balance = await service.balance();

    expect(balance.toNumber()).toBe(0);
  });

  test('check balance after join', async () => {
    await makeSomeDai(3);

    const joinAmount = 2;
    await service.join(MDAI(joinAmount));

    const balanceBeforeTime = await service.balanceOf(proxyAddress);
    expect(balanceBeforeTime.toNumber()).toBe(joinAmount);

    const [chi1, chi2] = await mineBlocksAndReturnChi(3);
    const accruedInterest = calculateAccruedInterest(joinAmount, chi1, chi2);

    const balanceAfterTime = await service.balanceOf(proxyAddress);
    expect(balanceAfterTime.toNumber()).toBeCloseTo(
      joinAmount + accruedInterest,
      10
    );
  });

  test('check balance after join with multiple accounts', async () => {
    await makeSomeDai(3);
    await service.join(MDAI(2));

    const { address, key } = TestAccountProvider.nextAccount();
    await maker
      .service('accounts')
      .addAccount(address, { type: 'privateKey', key });

    const otherAccountJoinAmount = 1;
    await maker.getToken(MDAI).transfer(address, otherAccountJoinAmount);

    await mineBlocks(maker.service('web3'), 3);
    await maker
      .service('smartContract')
      .getContract('MCD_POT')
      .drip();

    maker.service('accounts').useAccount(address);
    const otherProxyAddress = await maker.service('proxy').ensureProxy();
    await dai.approveUnlimited(otherProxyAddress);
    await service.join(MDAI(otherAccountJoinAmount));

    const [chi1, chi2] = await mineBlocksAndReturnChi(3);
    const accruedInterest = calculateAccruedInterest(
      otherAccountJoinAmount,
      chi1,
      chi2
    );

    const balanceAfterTime = await service.balanceOf(otherProxyAddress);
    expect(balanceAfterTime.toNumber()).toBeCloseTo(
      otherAccountJoinAmount + accruedInterest,
      10
    );
  });

  // testing with rejects somehow causes tx nonces to go out of sync, so
  // commenting out this test for now
  xtest('cannot exit pot more than joined', async () => {
    await makeSomeDai(3);

    await service.join(MDAI(1));

    const startingBalance = (await dai.balance()).toNumber();

    const exit = service.exit(MDAI(2));
    expect(exit).rejects.toThrow();

    const endingBalance = (await dai.balance()).toNumber();
    expect(endingBalance).toBe(startingBalance);
  });

  test('join and exit pot', async () => {
    await makeSomeDai(3);

    const startingBalance = (await dai.balance()).toNumber();
    const amountBeforeJoin = (await service.balance()).toNumber();
    const joinAmount = 2;

    await service.join(MDAI(joinAmount));

    const amountAfterJoin = await service.balance();
    expect(amountAfterJoin.toNumber()).toBeCloseTo(
      amountBeforeJoin + joinAmount,
      10
    );

    const duringBalance = (await dai.balance()).toNumber();
    expect(duringBalance).toBe(startingBalance - joinAmount);

    const [chi1, chi2] = await mineBlocksAndReturnChi(3);
    const accruedInterest = calculateAccruedInterest(joinAmount, chi1, chi2);

    await service.exit(MDAI(joinAmount));

    const amountAfterExit = await service.balance();
    expect(amountAfterExit.toNumber()).toBeCloseTo(accruedInterest, 10);

    const endingBalance = (await dai.balance()).toNumber();
    expect(endingBalance).toBe(startingBalance);
  });

  test('exit all', async () => {
    await makeSomeDai(3);

    const startingBalance = (await dai.balance()).toNumber();
    const joinAmount = 2;
    await service.join(MDAI(joinAmount));

    const [chi1, chi2] = await mineBlocksAndReturnChi(3);
    const accruedInterest = calculateAccruedInterest(joinAmount, chi1, chi2);

    await service.exitAll();

    const amountAfterExit = await service.balance();
    expect(amountAfterExit.toNumber()).toBe(0);

    const endingBalance = (await dai.balance()).toNumber();
    expect(endingBalance).toBeCloseTo(startingBalance + accruedInterest, 10);
  });
});
