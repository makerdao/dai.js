import EthereumTokenService from './EthereumTokenService';

test('getTokens returns tokens', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();
  ethereumTokenService.manager().connect()
    .then(() => {
      return ethereumTokenService.getTokens();
    })
    .then((tokens)=>{
    	expect(tokens.includes('DAI')).toBe(true);
    	expect(tokens.includes('MKR')).toBe(true);
    	done();
    });
});