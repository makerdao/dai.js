import EthereumTokenService from './EthereumTokenService';
import SmartContractService from './SmartContractService';
import Web3Service from '../web3/Web3Service';


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