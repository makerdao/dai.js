import { buildTestEthereumCdpService } from '../helpers/serviceBuilders';
import { USD_DAI } from '../../src/eth/Currency';

let cdpService;

beforeAll(async () => {
  cdpService = buildTestEthereumCdpService();
  await cdpService.manager().authenticate();
});

afterAll(async () => {
  // other tests expect this to be the case
  await cdpService.get('price').setEthPrice('400');
});

test('can read the liquidation ratio', async () => {
  const liquidationRatio = await cdpService.getLiquidationRatio();
  expect(liquidationRatio.toString()).toEqual('1.5');
});

test('can read the liquidation penalty', async () => {
  const liquidationPenalty = await cdpService.getLiquidationPenalty();
  expect(liquidationPenalty.toString()).toEqual('0.13');
});

test('can read the annual governance fee', async () => {
  const governanceFee = await cdpService.getAnnualGovernanceFee();
  expect(governanceFee.toFixed(3)).toEqual('0.005');
});

test('can read the target price', async () => {
  const tp = await cdpService.getTargetPrice();
  expect(tp).toEqual(USD_DAI(1));
});

test('can calculate system collateralization', async () => {
  const cdp = await cdpService.openCdp();
  const scA = await cdpService.getSystemCollateralization();

  await cdp.lockEth(0.1);
  const scB = await cdpService.getSystemCollateralization();
  expect(scB).toBeGreaterThan(scA);

  await cdp.drawDai(10);
  const scC = await cdpService.getSystemCollateralization();
  expect(scB).toBeGreaterThan(scC);
});
