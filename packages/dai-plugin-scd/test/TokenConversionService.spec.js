import { buildTestService } from '../helpers/serviceBuilders';
import { PETH, WETH } from '../../src/eth/Currency';

let owner, weth, peth, conversionService, tokenService;

async function buildTestTokenConversionService(maxAllowance = true) {
  const service = buildTestService('conversion', {
    allowance: maxAllowance ? true : { useMinimizeAllowancePolicy: true },
    conversion: true
  });

  await service.manager().authenticate();
  return service;
}

beforeEach(async () => {
  conversionService = await buildTestTokenConversionService();
  tokenService = conversionService.get('token');
  owner = tokenService.get('web3').currentAddress();
  weth = tokenService.getToken(WETH);
  peth = tokenService.getToken(PETH);
});

test('should convert eth to weth', async () => {
  const initialBalance = await weth.balanceOf(owner);
  await conversionService.convertEthToWeth('0.1');
  const newBalance = await weth.balanceOf(owner);

  expect(newBalance.toNumber()).toBeCloseTo(initialBalance.toNumber() + 0.1);
});

test('should convert weth to peth', async () => {
  const initialBalance = await peth.balanceOf(owner);
  await conversionService.convertEthToWeth('0.1');
  await conversionService.convertWethToPeth('0.1');
  const newBalance = await peth.balanceOf(owner);

  expect(newBalance.toNumber()).toBeCloseTo(initialBalance.toNumber() + 0.1);
});

test('should convert eth to peth', async () => {
  const initialBalance = await peth.balanceOf(owner);
  await conversionService.convertEthToPeth('0.1');
  const newBalance = await peth.balanceOf(owner);

  expect(newBalance.toNumber()).toBeCloseTo(initialBalance.toNumber() + 0.1);
});

describe('back to eth', () => {
  beforeAll(async () => {
    await conversionService.convertEthToWeth('0.1');
    await conversionService.convertEthToPeth('0.2');
  });

  test('should convert weth to eth', async () => {
    const initialBalance = await weth.balanceOf(owner);
    await conversionService.convertWethToEth(initialBalance);
    const newBalance = await weth.balanceOf(owner);

    expect(initialBalance.toNumber()).toBeGreaterThan(newBalance.toNumber());
  });

  test('should convert peth to weth', async () => {
    const initialBalance = await peth.balanceOf(owner);
    await conversionService.convertPethToWeth('0.1');
    const newBalance = await peth.balanceOf(owner);

    expect(initialBalance.toNumber()).toBeGreaterThan(newBalance.toNumber());
  });

  test('should convert peth to eth', async () => {
    const initialBalance = await peth.balanceOf(owner);
    await conversionService.convertPethToEth('0.1');
    const newBalance = await peth.balanceOf(owner);

    expect(initialBalance.toNumber()).toBeGreaterThan(newBalance.toNumber());
  });
});
