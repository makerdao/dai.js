import EthereumTokenService from './EthereumTokenService';
import tokens from '../../contracts/tokens';

test('getTokens returns tokens', (done) => {
  const ethereumTokenService = EthereumTokenService.buildEthersService();
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
  const ethereumTokenService = EthereumTokenService.buildEthersService();
  ethereumTokenService.manager().connect()
    .then(() => {
      expect(() => ethereumTokenService.getToken('XYZ')).toThrow();
      done();
    });
});

/*
test('getToken returns an ERC20Token Object', (done) => {
  const ethereumTokenService = EthereumTokenService.buildEthersService(); //need to connect to a blockchain with deployed contracts
  ethereumTokenService.manager().connect()
    .then(() => {
      return ethereumTokenService.getToken(tokens.MKR);
    })
    .then( token =>{
      //expect(!!token).toBe(true);
      done();
    });
});*/

test('transfer EtherToken using test blockchain', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();
  const token = ethereumTokenService.getToken(tokens.ETH);
  let initSenderBalance = 0;
  let initReceiverBalance = 0;
  ethereumTokenService.manager().connect()
    .then(() =>{
      return Promise.all([
        token.balanceOf('0x81431b69b1e0e334d4161a13c2955e0f3599381e'),
        token.balanceOf('0x0000000000000000000000000000000000000001')
        ])
    })
    .then(initialBalances => {
      initSenderBalance = initialBalances[0];
      initReceiverBalance = initialBalances[1];
      return token.transfer('0x81431b69b1e0e334d4161a13c2955e0f3599381e', '0x0000000000000000000000000000000000000001', 1000000000);
    })
    .then(() => {
      return Promise.all([
        token.balanceOf('0x81431b69b1e0e334d4161a13c2955e0f3599381e'),
        token.balanceOf('0x0000000000000000000000000000000000000001')
        ])
    })
    .then(finalBalances =>{
      expect(parseInt(finalBalances[1].toString(10),10)-initReceiverBalance).toEqual(1000000000); 
      //expect(parseInt(finalBalances[0].toString(10),10)+1000000000).toEqual(initSenderBalance); //need to figure out how to subtract gas cost from this
      done();
    });
});

/*
test('transfer EtherToken using blockchain from EthersJS', (done) => {
  const ethereumTokenService = EthereumTokenService.buildEthersService();
  const token = ethereumTokenService.getToken(tokens.ETH);
  let initSenderBalance = 0;
  let initReceiverBalance = 0;
  ethereumTokenService.manager().connect()
    .then(() =>{
      return Promise.all([
        token.balanceOf('0x81431b69b1e0e334d4161a13c2955e0f3599381e'),
        token.balanceOf('0x0000000000000000000000000000000000000001')
        ])
    })
    .then(initialBalances => {
      initSenderBalance = initialBalances[0];
      initReceiverBalance = initialBalances[1];
      return token.transfer('0x81431b69b1e0e334d4161a13c2955e0f3599381e', '0x0000000000000000000000000000000000000001', 1000000000);
    })
    .then(() => {
      return Promise.all([
        token.balanceOf('0x81431b69b1e0e334d4161a13c2955e0f3599381e'),
        token.balanceOf('0x0000000000000000000000000000000000000001')
        ])
    })
    .then(finalBalances =>{
      expect(parseInt(finalBalances[1].toString(10),10)-initReceiverBalance).toEqual(1000000000); 
      //expect(parseInt(finalBalances[0].toString(10),10)+1000000000).toEqual(initSenderBalance); //need to figure out how to subtract gas cost from this
      done();
    });
});
*/

test('get Ether balance using test blockchain', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();
  ethereumTokenService.manager().connect()
    .then(() => {
      const token =  ethereumTokenService.getToken(tokens.ETH);
      return token.balanceOf('0x0000000000000000000000000000000000000003'); //update to check balance of account with ether
    })
    .then(balance => {
      expect(parseInt(balance.toString(10),10)).toEqual(0);
      done();
    });
});

/*
test('get Ether balance using blockchain from EthersJS', (done) => {
  const ethereumTokenService = EthereumTokenService.buildEthersService();
  ethereumTokenService.manager().connect()
    .then(() => {
      const token =  ethereumTokenService.getToken(tokens.ETH);
      return token.balanceOf('0x0000000000000000000000000000000000000003'); //update to check balance of account with ether
    })
    .then(balance => {
      expect(parseInt(balance.toString(10),10)).toEqual(0);
      done();
    });
});
*/

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

