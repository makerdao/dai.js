import EthereumTokenService from '../../src/eth/EthereumTokenService';
import tokens from '../../contracts/tokens';

test('getTokens returns tokens', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().authenticate()
    .then(() => {
      const tokensList = ethereumTokenService.getTokens();
      expect(tokensList.includes(tokens.DAI)).toBe(true);
      expect(tokensList.includes(tokens.MKR)).toBe(true);
      done();
    });
});

test('getTokenVersions returns token versions using remote blockchain', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().authenticate()
    .then(() => {
      const tokenVersions = ethereumTokenService.getTokenVersions();

      expect(tokenVersions[tokens.MKR]).toEqual([1,2]);
      expect(tokenVersions[tokens.DAI]).toEqual([1]);
      expect(tokenVersions[tokens.ETH]).toEqual([1]);

      expect(ethereumTokenService.getToken(tokens.MKR)._contract.getAddress().toUpperCase())
        .toBe(ethereumTokenService.getToken(tokens.MKR, 2)._contract.getAddress().toUpperCase());
      done();
    });
});

test('getToken returns token object of correct version', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().authenticate()
    .then(() => {

      expect(ethereumTokenService.getToken(tokens.MKR)._contract.getAddress().toUpperCase())
        .toBe(ethereumTokenService.getToken(tokens.MKR, 2)._contract.getAddress().toUpperCase());

      expect(ethereumTokenService.getToken(tokens.MKR)._contract.getAddress().toUpperCase())
        .not.toBe(ethereumTokenService.getToken(tokens.MKR, 1)._contract.getAddress().toUpperCase());

      done();
    });
});

test('getToken throws when given unknown token symbol', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().authenticate()
    .then(() => {
      expect(() => ethereumTokenService.getToken('XYZ')).toThrow();
      done();
    });
});
/*
test('approve DAI to Oasis', (done) => setTimeout(() => {
  const web3 = Web3Service.buildInfuraService('kovan', '0xa69d30145491b4c1d55e52453cabb2e73a9daff6326078d49376449614d2f700'),
    smartContract = SmartContractService.buildTestService(web3),
    ethereumTokenService = EthereumTokenService.buildTestService(smartContract);

  ethereumTokenService.manager().authenticate()
    .then(() => {
      const token = ethereumTokenService.getToken(tokens.DAI),
        makerOtcAddress = ethereumTokenService.get('smartContract').getContractByName(contracts.MAKER_OTC).getAddress();
      return token.approveUnlimited(makerOtcAddress);
    })
    .then(transaction =>{
      expect(!!transaction).toBe(true);
      done();
    });
  
}, 15000), 30000);*/