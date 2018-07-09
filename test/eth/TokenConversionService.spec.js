import { buildTestService } from '../helpers/serviceBuilders';
import tokens from '../../contracts/tokens';

async function buildTestTokenConversionService(maxAllowance = true) {
  const service = buildTestService('conversion', {
    allowance: maxAllowance ? true : { useMinimizeAllowancePolicy: true },
    conversion: true
  });

  await service.manager().authenticate();
  return service;
}

test('should convert eth to weth', async () => {
  let initialBalance, initialEthBalance, owner, token, eth;
  const conversionService = await buildTestTokenConversionService();
  const tokenService = conversionService.get('token');
  owner = tokenService.get('web3').defaultAccount();
  token = tokenService.getToken(tokens.WETH);
  eth = tokenService.getToken(tokens.ETH);

  initialEthBalance = parseFloat(await eth.balanceOf(owner));
  initialBalance = parseFloat(await token.balanceOf(owner));
  await conversionService.convertEthToWeth('0.1');
  const newEthBalance = await eth.balanceOf(owner);
  expect(parseFloat(initialEthBalance)).toBeGreaterThan(
    parseFloat(newEthBalance)
  );
  const newBalance = await token.balanceOf(owner);
  expect(parseFloat(newBalance)).toBeCloseTo(initialBalance + 0.1);
});

test('should convert weth to peth', async () => {
  const conversionService = await buildTestTokenConversionService(false);
  const tokenService = conversionService.get('token');
  const owner = tokenService.get('web3').defaultAccount();
  const token = tokenService.getToken(tokens.PETH);

  const initialBalance = parseFloat(await token.balanceOf(owner));
  await conversionService.convertEthToWeth('0.1');
  await conversionService.convertWethToPeth('0.1');
  const newBalance = await token.balanceOf(owner);
  expect(parseFloat(newBalance)).toBeCloseTo(initialBalance + 0.1);
});

test('should convert eth to peth', async done => {
  let initialBalance;
  const conversionService = await buildTestTokenConversionService(false);
  conversionService
    .manager()
    .authenticate()
    .then(() => {
      const tokenService = conversionService.get('token');
      const owner = tokenService.get('web3').defaultAccount();
      const token = tokenService.getToken(tokens.PETH);

      token
        .balanceOf(owner)
        .then(balance => (initialBalance = parseFloat(balance)));
      conversionService.convertEthToPeth('0.1').then(() => {
        token.balanceOf(owner).then(newBalance => {
          expect(parseFloat(newBalance)).toBeCloseTo(initialBalance + 0.1);
          done();
        });
      });
    });
});
