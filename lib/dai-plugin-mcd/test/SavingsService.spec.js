import { mcdMaker, setupCollateral } from './helpers';
import { ServiceRoles } from '../src/constants';
import BigNumber from 'bignumber.js'
import { MDAI, ETH } from '../src/index';
import { stringToBytes } from '../src/utils';
import { RAD } from '../src/constants'

let service, maker, dai;

describe('Savings Service', () => {
  async function makeSomeDai(amount) {
    const cdpMgr = await maker.service(ServiceRoles.CDP_MANAGER);
    await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
    await cdpMgr.openLockAndDraw('ETH-A', ETH(1), MDAI(amount));
  }

  beforeAll(async () => {
    maker = await mcdMaker();
    service = maker.service(ServiceRoles.SAVINGS);
    dai = maker.getToken(MDAI);

    await maker.service('proxy').ensureProxy();
  });

  beforeEach(async () => {
    const amountRemaining = await service.balance();
    if (amountRemaining.gt(0)) await service.exit(MDAI(amountRemaining));
  })

  test('get dai savings rate', async () => {
    const dsr = await service.getDaiSavingsRate();

    expect(maker.service('web3')._web3.utils.isBigNumber(dsr)).toBe(true);
  });

  test('get total amount of dai in pot', async () => {
    await makeSomeDai(3)
    const potTotalBeforeJoin = await service.getTotalDai();
    expect(potTotalBeforeJoin.toNumber()).toBe(0)

    await service.join(MDAI(2))

    const potTotalAfterJoin = await service.getTotalDai();
    expect(potTotalAfterJoin.toNumber()).toBe(2)
  })

  test('check amount in balance', async () => {
    const amount = await service.balance()
    expect(amount.toNumber()).toBe(0)
  });

  test('check amount using balance of', async () => {
    const proxyAddress = await maker.currentProxy()
    const amount = await service.balanceOf(proxyAddress)
    expect(amount.toNumber()).toBe(0)
  });

  test('cannot exit pot more than joined', async () => {
    await makeSomeDai(3)

    await service.join(MDAI(1))

    const startingBalance = (await dai.balance()).toNumber()

    expect(service.exit(MDAI(2))).rejects.toThrow()

    const endingBalance = (await dai.balance()).toNumber()
    expect(endingBalance).toBe(startingBalance)
  })

  test('join and exit pot', async () => {
    const startingBalance = (await dai.balance()).toNumber()
    const amountBeforeJoin = (await service.balance()).toNumber()

    await service.join(MDAI(2))
    const amountAfterJoin = await service.balance()
    expect(amountAfterJoin.toNumber()).toBe(amountBeforeJoin + 2)

    const duringBalance = (await dai.balance()).toNumber()
    expect(duringBalance).toBe(startingBalance - 2)

    await service.exit(MDAI(2))
    const amountAfterExit = await service.balance()
    expect(amountAfterExit.toNumber()).toBe(amountBeforeJoin)

    const endingBalance = (await dai.balance()).toNumber()
    expect(endingBalance).toBe(startingBalance)
  });
})
