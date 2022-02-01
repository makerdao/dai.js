import {
  takeSnapshot,
  restoreSnapshot,
  mineBlocks,
  TestAccountProvider
} from '@makerdao/test-helpers';
import { mcdMaker, setupCollateral } from './helpers';
import { ServiceRoles } from '../src/constants';
import { DAI, ETH } from '../src/index';
import BigNumber from 'bignumber.js';
import findIndex from 'lodash/findIndex';

let service, maker, dai, proxyAddress;

function calculateAccruedInterest(amount, chi1, chi2) {
  return chi2
    .times(amount)
    .minus(chi1.times(amount))
    .toNumber();
}

async function mineBlocksAndReturnChi(blocksToMine) {
  const chiBeforeTime = new BigNumber(await service.chi());

  await mineBlocks(maker.service('web3'), blocksToMine);
  await maker
    .service('smartContract')
    .getContract('MCD_POT')
    .drip();

  const chiAfterTime = new BigNumber(await service.chi());

  return [chiBeforeTime, chiAfterTime];
}

describe('Savings Service', () => {
  let snapshotData;

  async function makeSomeDai(amount) {
    const cdpMgr = await maker.service(ServiceRoles.CDP_MANAGER);
    await setupCollateral(maker, 'ETH-A', { price: 150 });
    await cdpMgr.openLockAndDraw('ETH-A', ETH(10), DAI(amount));
  }

  beforeAll(async () => {
    maker = await mcdMaker();
    service = maker.service(ServiceRoles.SAVINGS);
    dai = maker.getToken(DAI);
    proxyAddress = await maker.service('proxy').ensureProxy();
    await dai.approveUnlimited(proxyAddress);
  }, 30000);

  beforeEach(async () => {
    maker.service('accounts').useAccount('default');
    snapshotData = await takeSnapshot(maker);
  }, 30000);

  afterEach(async () => {
    await restoreSnapshot(snapshotData, maker);
  }, 30000);

  test('get dai savings rate', async () => {
    const dsr = await service.getYearlyRate();
    expect(dsr.toNumber()).toBeCloseTo(0.01);
  }, 30000);

  test('get total amount of dai in pot', async () => {
    await makeSomeDai(100);
    const potTotalBeforeJoin = await service.getTotalDai();
    expect(potTotalBeforeJoin.toNumber()).toBe(0);

    await service.join(DAI(2));

    const potTotalAfterJoin = await service.getTotalDai();
    expect(potTotalAfterJoin.toNumber()).toBe(2);
  }, 30000);

  test('get total amount of dai in pot after some time', async () => {
    await makeSomeDai(100);
    const potTotalBeforeJoin = await service.getTotalDai();
    expect(potTotalBeforeJoin.toNumber()).toBe(0);

    const joinAmount = 2;
    await service.join(DAI(joinAmount));

    const potTotalAfterJoin = await service.getTotalDai();
    expect(potTotalAfterJoin.toNumber()).toBe(2);

    const [chi1, chi2] = await mineBlocksAndReturnChi(3);
    const accruedInterest = calculateAccruedInterest(joinAmount, chi1, chi2);

    const potTotalAfterTime = await service.getTotalDai();
    expect(potTotalAfterTime.toNumber()).toBeCloseTo(
      joinAmount + accruedInterest,
      10
    );
  }, 30000);

  test('check amount in balance', async () => {
    const amount = await service.balance();
    expect((DAI as any).isInstance(amount)).toBeTruthy();
  }, 30000);

  test('check amount using balance of', async () => {
    const proxyAddress = await maker.currentProxy();
    const amount = await service.balanceOf(proxyAddress);
    expect((DAI as any).isInstance(amount)).toBeTruthy();
  }, 30000);

  test('get balance without proxy', async () => {
    const { address, key } = TestAccountProvider.nextAccount();
    await maker
      .service('accounts')
      .addAccount(address, { type: 'privateKey', key });
    maker.service('accounts').useAccount(address);

    const balance = await service.balance();

    expect(balance.toNumber()).toBe(0);
  }, 30000);

  test('check balance after join', async () => {
    await makeSomeDai(100);

    const joinAmount = 2;
    await service.join(DAI(joinAmount));

    const balanceBeforeTime = await service.balanceOf(proxyAddress);
    expect(balanceBeforeTime.toNumber()).toBe(joinAmount);

    const [chi1, chi2] = await mineBlocksAndReturnChi(3);
    const accruedInterest = calculateAccruedInterest(joinAmount, chi1, chi2);

    const balanceAfterTime = await service.balanceOf(proxyAddress);
    expect(balanceAfterTime.toNumber()).toBeCloseTo(
      joinAmount + accruedInterest,
      10
    );
  }, 30000);

  test('check balance after join with multiple accounts', async () => {
    await makeSomeDai(100);
    await service.join(DAI(2));

    const { address, key } = TestAccountProvider.nextAccount();
    await maker
      .service('accounts')
      .addAccount(address, { type: 'privateKey', key });

    const otherAccountJoinAmount = 1;
    await maker.getToken(DAI).transfer(address, otherAccountJoinAmount);

    await mineBlocks(maker.service('web3'), 3);
    await maker
      .service('smartContract')
      .getContract('MCD_POT')
      .drip();

    maker.service('accounts').useAccount(address);
    const otherProxyAddress = await maker.service('proxy').ensureProxy();
    await dai.approveUnlimited(otherProxyAddress);
    await service.join(DAI(otherAccountJoinAmount));

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
  }, 30000);

  test('cannot exit pot more than joined', async () => {
    await makeSomeDai(100);

    await service.join(DAI(1));

    const startingBalance = await dai.balance();

    const exit = service.exit(DAI(2));
    await expect(exit).rejects.toThrow();

    const endingBalance = await dai.balance();
    expect(endingBalance).toEqual(startingBalance);
  }, 30000);

  test('join and exit pot', async () => {
    await makeSomeDai(100);

    const startingBalance = await dai.balance();
    const amountBeforeJoin = await service.balance();
    const joinAmount = 2;

    await service.join(DAI(joinAmount));

    const amountAfterJoin = await service.balance();
    expect(amountAfterJoin.toNumber()).toBeCloseTo(
      amountBeforeJoin.plus(joinAmount).toNumber(),
      10
    );

    const duringBalance = await dai.balance();
    expect(duringBalance).toEqual(startingBalance.minus(joinAmount));

    const [chi1, chi2] = await mineBlocksAndReturnChi(3);
    const accruedInterest = calculateAccruedInterest(joinAmount, chi1, chi2);

    await service.exit(DAI(joinAmount));

    const amountAfterExit = await service.balance();
    expect(amountAfterExit.toNumber()).toBeCloseTo(accruedInterest, 8);

    const endingBalance = await dai.balance();

    // Due to how 'exit' handles rounding sub-wei amounts, the ending balance can be one wei less than expected
    const amountLessWei = DAI(startingBalance)
      .minus((DAI as any).wei(1))
      .toBigNumber()
      .toString();
    expect(
      [startingBalance.toBigNumber().toString(), amountLessWei].includes(
        endingBalance.toBigNumber().toString()
      )
    ).toBe(true);
  }, 30000);

  test('exit all', async () => {
    await makeSomeDai(100);

    const startingBalance = (await dai.balance()).toNumber();
    const joinAmount = 2;
    await service.join(DAI(joinAmount));

    const [chi1, chi2] = await mineBlocksAndReturnChi(3);
    const accruedInterest = calculateAccruedInterest(joinAmount, chi1, chi2);

    await service.exitAll();

    const amountAfterExit = await service.balance();
    expect(amountAfterExit.toNumber()).toBe(0);

    const endingBalance = (await dai.balance()).toNumber();
    expect(endingBalance).toBeCloseTo(startingBalance + accruedInterest, 8);
  }, 30000);

  xtest('get dsr event history via web3', async () => {
    await makeSomeDai(10);
    await service.join(DAI(3));
    await mineBlocks(maker.service('web3'), 5);

    const exitAmount = '2';
    await service.exit(DAI(exitAmount));
    const events = await service.getEventHistory(proxyAddress);

    const depositEventIdx = findIndex(events, { type: 'DSR_DEPOSIT' } as any);
    const withdrawEventIdx = findIndex(events, { type: 'DSR_WITHDRAW' } as any);

    expect(depositEventIdx).toBeGreaterThan(-1);
    expect(events[depositEventIdx].gem).toEqual('DAI');
    expect(events[depositEventIdx].amount).toEqual('3');

    expect(withdrawEventIdx).toBeGreaterThan(-1);
    expect(events[withdrawEventIdx].gem).toEqual('DAI');

    // Due to how 'exit' handles rounding sub-wei amounts, the exit amount returned can be one wei less than intended
    const amountLessWei = DAI(exitAmount)
      .minus((DAI as any).wei(1))
      .toBigNumber()
      .toString();
    expect(
      [exitAmount, amountLessWei].includes(events[withdrawEventIdx].amount)
    ).toBe(true);

    await service.join(DAI(1));

    const cachedEvents = await service.getEventHistory(proxyAddress);
    expect(cachedEvents.length).toEqual(2);
  });

  test('earnings to date', async () => {
    await makeSomeDai(100);
    const joinAmount = 10;
    await service.join(DAI(joinAmount));

    const etdA = await service.getEarningsToDate(proxyAddress);
    const [chi1, chi2] = await mineBlocksAndReturnChi(10);
    const etdB = await service.getEarningsToDate(proxyAddress);

    expect(etdB.gt(etdA)).toBe(true);
    // in the test we know the chi, so we can verify that calculation is close
    const accruedInterest = calculateAccruedInterest(joinAmount, chi1, chi2);
    expect(etdB.minus(etdA).toNumber()).toBeCloseTo(accruedInterest, 9);
  }, 30000);
});
