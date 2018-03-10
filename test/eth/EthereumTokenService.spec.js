import EthereumTokenService from '../../src/eth/EthereumTokenService';
import tokens from '../../contracts/tokens';

test('getTokens returns tokens', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().connect()
    .then(() => {
      const tokensList = ethereumTokenService.getTokens();
      expect(tokensList.includes(tokens.DAI)).toBe(true);
      expect(tokensList.includes(tokens.MKR)).toBe(true);
      done();
    });
});

test('getTokenVersions returns token versions using remote blockchain', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().connect()
    .then(() => {
      const tokenVersions = ethereumTokenService.getTokenVersions();

      expect(tokenVersions[tokens.MKR]).toEqual([1,2]);
      expect(tokenVersions[tokens.DAI]).toEqual([1]);
      expect(tokenVersions[tokens.ETH]).toEqual([1]);

      expect(ethereumTokenService.getToken(tokens.MKR)._contract.address.toUpperCase())
        .toBe(ethereumTokenService.getToken(tokens.MKR, 2)._contract.address.toUpperCase());

      done();
    });
});

test('getToken returns token object of correct version', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().connect()
    .then(() => {

      expect(ethereumTokenService.getToken(tokens.MKR)._contract.address.toUpperCase())
        .toBe(ethereumTokenService.getToken(tokens.MKR, 2)._contract.address.toUpperCase());

      expect(ethereumTokenService.getToken(tokens.MKR)._contract.address.toUpperCase())
        .not.toBe(ethereumTokenService.getToken(tokens.MKR, 1)._contract.address.toUpperCase());

      done();
    });
});


test('getToken throws when given unknown token symbol', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().connect()
    .then(() => {
      expect(() => ethereumTokenService.getToken('XYZ')).toThrow();
      done();
    });
});
