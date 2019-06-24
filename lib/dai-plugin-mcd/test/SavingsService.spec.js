import { mcdMaker, setupCollateral } from './helpers';
import { ServiceRoles } from '../src/constants';
import BigNumber from 'bignumber.js'
import { MDAI, ETH } from '../src/index';
import { stringToBytes } from '../src/utils';
import { RAD } from '../src/constants'

let service, maker, dai, vat, potAddress, currentAddress, daiAdapter, daiJoinAddress

describe('Savings Service', () => {
  async function makeSomeDai(amount) {
    const cdpMgr = await maker.service(ServiceRoles.CDP_MANAGER)
    await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
    await cdpMgr.openLockAndDraw('ETH-A', ETH(1), MDAI(amount));
  }

  beforeAll(async () => {
    maker = await mcdMaker();
    service = maker.service(ServiceRoles.SAVINGS);
    dai = maker.getToken(MDAI);
    vat = maker.service('smartContract').getContract('MCD_VAT')
    potAddress = maker.service('smartContract').getContractAddress('MCD_POT')
    daiAdapter = maker.service('smartContract').getContract('MCD_JOIN_DAI')
    daiJoinAddress = maker.service('smartContract').getContractAddress('MCD_JOIN_DAI')

    currentAddress = maker.currentAddress()

    await vat.hope(daiJoinAddress)

    await dai.approveUnlimited(daiJoinAddress)
  });

  afterEach(async () => {
    await vat.nope(potAddress)
  })

  afterAll(async () => {
    await vat.nope(daiJoinAddress)
  })

  beforeEach(async () => {
    const amountRemaining = await service.balance(currentAddress)
    if (amountRemaining.gt(0)) await service.exit(MDAI(amountRemaining))

    const amt = await vat.dai(currentAddress)
    const amountInVat = new BigNumber(amt).div(RAD)
    if (amountInVat > 0) await daiAdapter.exit(maker.currentAddress(), MDAI(amountInVat).toFixed('wei'))
  })

  test('get dai savings rate', async () => {
    const dsr = await service.getDaiSavingsRate();

    expect(maker.service('web3')._web3.utils.isBigNumber(dsr)).toBe(true);
  });

  test('get total amount of dai in pot', async () => {
    await makeSomeDai(3)
    const potTotalBeforeJoin = await service.getTotalDai();

    expect(potTotalBeforeJoin.toNumber()).toBe(0)

    await daiAdapter.join(currentAddress, MDAI(2).toFixed('wei'))
    await service.join(MDAI(2))

    const potTotalAfterJoin = await service.getTotalDai();
    expect(potTotalAfterJoin.toNumber()).toBe(2)
  })

  test('check amount in balance', async () => {
    const amount = await service.balance(maker.currentAddress())
    expect(amount.toNumber()).toBe(0)
  });

  test('ensure dai can be moved', async () => {
    const canDaiBeMovedBefore = await service.canMoveDaiOnBehalfOf(maker.currentAddress())
    expect(canDaiBeMovedBefore).toBe(false)

    await service.ensureDaiCanBeMoved()

    const canDaiBeMovedAfter = await service.canMoveDaiOnBehalfOf(maker.currentAddress())
    expect(canDaiBeMovedAfter).toBe(true)
  });

  test('cannot exit pot more than joined', async () => {
    await makeSomeDai(3)
    await daiAdapter.join(currentAddress, MDAI(2).toFixed('wei'))

    await service.join(MDAI(1))

    const startingBalance = (await dai.balance()).toNumber()

    expect(service.exit(MDAI(2))).rejects.toThrow()

    const endingBalance = (await dai.balance()).toNumber()
    expect(endingBalance).toBe(startingBalance)
  })

  test('join and exit pot', async () => {
    await daiAdapter.join(currentAddress, MDAI(2).toFixed('wei'))

    const startingBalance = (await dai.balance()).toNumber()
    const amountBeforeJoin = (await service.balance(maker.currentAddress())).toNumber()

    await service.join(MDAI(2))
    const amountAfterJoin = await service.balance(maker.currentAddress())
    expect(amountAfterJoin.toNumber()).toBe(amountBeforeJoin + 2)

    await service.exit(MDAI(2))
    const amountAfterExit = await service.balance(maker.currentAddress())
    expect(amountAfterExit.toNumber()).toBe(amountBeforeJoin)

    const endingBalance = (await dai.balance()).toNumber()
    expect(endingBalance).toBe(startingBalance)
  });
})
