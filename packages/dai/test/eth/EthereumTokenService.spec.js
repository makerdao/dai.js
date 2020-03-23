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

test('_getTokenInfo returns token address for current network', () => {
  ethereumTokenService._addedTokens.FOO = [
    {
      address: {
        testnet: '0xtest',
        kovan: '0xkovan'
      }
    }
  ];

  const tokenInfo = ethereumTokenService._getTokenInfo('FOO');
  expect(tokenInfo).toEqual({ address: '0xtest' });
});

test('addressOverrides', async () => {
  const service = buildTestEthereumTokenService({
    token: {
      addressOverrides: {
        PETH: {
          testnet: '0xmockpeth',
          kovan: '0xmockpeth2'
        },
        WETH: '0xmockweth'
      }
    }
  });
  await service.manager().authenticate();

  expect(service.getToken('PETH')._contract.address).toBe('0xmockpeth');
  expect(service.getToken('WETH')._contract.address).toBe('0xmockweth');
});