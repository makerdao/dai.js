import { buildTestEthereumTokenService } from '../helpers/serviceBuilders';
import tokens from '../../contracts/tokens';
import { MKR } from '../../src/eth/Currency';

let ethereumTokenService;

beforeAll(async () => {
  ethereumTokenService = buildTestEthereumTokenService();
  await ethereumTokenService.manager().authenticate();
});

test('getTokens returns tokens', () => {
  const tokensList = ethereumTokenService.getTokens();
  expect(tokensList.includes(tokens.DAI)).toBe(true);
  expect(tokensList.includes(tokens.MKR)).toBe(true);
});

test('getTokenVersions returns token versions using remote blockchain', () => {
  const tokenVersions = ethereumTokenService.getTokenVersions();

  expect(tokenVersions[tokens.MKR]).toEqual([1, 2]);
  expect(tokenVersions[tokens.DAI]).toEqual([1]);
  expect(tokenVersions[tokens.ETH]).toEqual([1]);

  expect(
    ethereumTokenService.getToken(tokens.MKR)._contract.address.toUpperCase()
  ).toBe(
    ethereumTokenService.getToken(tokens.MKR, 2)._contract.address.toUpperCase()
  );
});

test('getToken returns token object of correct version', () => {
  expect(
    ethereumTokenService.getToken(tokens.MKR)._contract.address.toUpperCase()
  ).toBe(
    ethereumTokenService.getToken(tokens.MKR, 2)._contract.address.toUpperCase()
  );

  expect(
    ethereumTokenService.getToken(tokens.MKR)._contract.address.toUpperCase()
  ).not.toBe(
    ethereumTokenService.getToken(tokens.MKR, 1)._contract.address.toUpperCase()
  );
});

test('getToken throws when given unknown token symbol', () => {
  expect(() => ethereumTokenService.getToken('XYZ')).toThrow();
});

test('getToken works with Currency', () => {
  const token = ethereumTokenService.getToken(MKR);
  expect(token.symbol).toBe('MKR');
});
