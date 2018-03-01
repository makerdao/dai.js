import EthereumTokenService from './EthereumTokenService';
import tokens from '../../contracts/tokens';

test('getTokens returns tokens', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();
  ethereumTokenService.manager().connect()
    .then(() => {
      return ethereumTokenService.getTokens();
    })
    .then((tokensList)=>{
      expect(tokensList.includes(tokens.DAI)).toBe(true);
      expect(tokensList.includes(tokens.MKR)).toBe(true);
      done();
    });
});

test('getTokenVersions returns token versions using remote blockchain', (done) => {
  const ethereumTokenService = EthereumTokenService.buildRemoteService(); //needed to build a remote service here so that its either on mainnet or kovan
  ethereumTokenService.manager().connect()
    .then(() => {
      return ethereumTokenService.getTokenVersions();
    })
    .then((tokenVersions)=>{
      expect(tokenVersions[tokens.MKR]).toEqual([1,2]);
      expect(tokenVersions[tokens.DAI]).toEqual([1]);
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

//smartContractService.getContractByAddress() doesn't exist yet so this test fails until smartContractService is developed
/*
test('getToken returns an ERC20Token Object', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();
  ethereumTokenService.manager().connect()
    .then(() => {
      return ethereumTokenService.getToken(tokens.MKR);
    })
    .then( token =>{
      expect(!!token).toBe(true);
      done();
    });
});
*/

test('transfer EtherToken using test blockchain', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();
  let token = null;
  ethereumTokenService.manager().connect()
    .then(() => {
      token = ethereumTokenService.getToken(tokens.ETH);
      return token.transfer('0x81431b69b1e0e334d4161a13c2955e0f3599381e', '0x0000000000000000000000000000000000000001', 1000000000);
    })
    .then(() => token.balanceOf('0x0000000000000000000000000000000000000001'))
    .then(balance =>{
      expect(balance.toString(10)).toEqual('1000000000');
      done();
    });
});

test('transfer EtherToken using blockchain from EthersJS', (done) => {
  const ethereumTokenService = EthereumTokenService.buildEthersService();
  let token = null;
  ethereumTokenService.manager().connect()
    .then(() => {
      token = ethereumTokenService.getToken(tokens.ETH);
      return token.transfer('0x81431b69b1e0e334d4161a13c2955e0f3599381e', '0x0000000000000000000000000000000000000001', 1000000000);
    })
    .then(() => token.balanceOf('0x0000000000000000000000000000000000000001'))
    .then(balance =>{
      expect(balance.toString(10)).toEqual('1000000000');
      done();
    });
});

test('get Ether balance using test blockchain', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();
  ethereumTokenService.manager().connect()
    .then(() => {
      const token =  ethereumTokenService.getToken(tokens.ETH);
      return token.balanceOf('0x0000000000000000000000000000000000000003'); //update to check balance of account with ether
    })
    .then(balance => {
      expect(balance.toString(10)).toEqual('0');
      done();
    });
});

test('get Ether balance using blockchain from EthersJS', (done) => {
  const ethereumTokenService = EthereumTokenService.buildEthersService();
  ethereumTokenService.manager().connect()
    .then(() => {
      const token =  ethereumTokenService.getToken(tokens.ETH);
      return token.balanceOf('0x0000000000000000000000000000000000000003'); //update to check balance of account with ether
    })
    .then(balance => {
      expect(balance.toString(10)).toEqual('0');
      done();
    });
});

test('get Ether allowance returns max safe integer', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();
  ethereumTokenService.manager().connect()
    .then(() => {
      const token = ethereumTokenService.getToken(tokens.ETH); //this isn't asynch
      return token.allowance('0x0000000000000000000000000000000000000001', '0x0000000000000000000000000000000000000002');
    })
    .then(allowance => {
      expect(allowance.toString(10)).toEqual(Number.MAX_SAFE_INTEGER.toString(10));
      done();
    });
});

