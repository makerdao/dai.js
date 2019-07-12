import {
  mcdMaker,
  setupCollateral,
  takeSnapshot,
  restoreSnapshot
} from './helpers';
import { ServiceRoles } from '../src/constants';
import { MDAI, ETH } from '../src/index';

let service, maker, dai, proxyAddress;

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

  test('check amount in balance', async () => {
    const amount = await service.balance();
    expect(amount.symbol).toBe('MDAI');
  });

  test('check amount using balance of', async () => {
    const proxyAddress = await maker.currentProxy();
    const amount = await service.balanceOf(proxyAddress);
    expect(amount.symbol).toBe('MDAI');
  });

  test('cannot exit pot more than joined', async () => {
    await makeSomeDai(3);

    await service.join(MDAI(1));

    const startingBalance = (await dai.balance()).toNumber();

    expect(service.exit(MDAI(2))).rejects.toThrow();

    const endingBalance = (await dai.balance()).toNumber();
    expect(endingBalance).toBe(startingBalance);
  });

  test('join and exit pot', async () => {
    await makeSomeDai(3);
    await service._pot.drip();

    const startingBalance = (await dai.balance()).toNumber();
    const amountBeforeJoin = (await service.balance()).toNumber();

    await service.join(MDAI(2));
    await service._pot.drip();
    const amountAfterJoin = await service.balance();
    expect(amountAfterJoin.toNumber()).toBe(amountBeforeJoin + 2);

    const duringBalance = (await dai.balance()).toNumber();
    expect(duringBalance).toBe(startingBalance - 2);

    await service.exit(MDAI(2));
    const amountAfterExit = await service.balance();
    expect(amountAfterExit.toNumber()).toBe(amountBeforeJoin);

    const endingBalance = (await dai.balance()).toNumber();
    expect(endingBalance).toBe(startingBalance);
  });
});
