import EthereumCdpService from '../../src/eth/EthereumCdpService';
//import SmartContractService from '../../src/eth/SmartContractService';
//import contracts from '../../contracts/contracts';

test('open a CDP on ganache', (done) => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      // open a CDP
      var callPromise = service.openCdp();
      callPromise.then(function(/*txInfo*/) {
        //console.log('transaction data is: ', txInfo);
        done();
      });
    });
}, 10000); 

test('lock ETH in CDP on ganache', (done) => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {

      let cdpId = '1';
      let amount = 100
      var callPromise = service.lockEth(cdpId, amount);
      callPromise.then(function(txInfo) {
        console.log('transaction data is: ', txInfo);
        done();
      });
    });
  }, 10000); 
    
test('lock WETH in CDP on ganache', (done) => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {

      let cdpId = '1';
      let amount = 100;
      var callPromise = service.lockWeth(cdpId, amount);
      callPromise.then(function(txInfo) {
        console.log('transaction data is: ', txInfo);
        done();
      });
    });
  }, 10000); 

test('free PETH from a CDP on ganache', (done) => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {

      let cdpId = '1';
      let amount = 100;
      var callPromise = service.free(cdpId, amount);
      callPromise.then(function(txInfo) {
        console.log('transaction data is: ', txInfo);
        done();
      });
    });
  }, 10000);

test('draw Dai from a CDP on ganache', (done) => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {

      let cdpId = '1';
      let amount = 100;
      var callPromise = service.draw(cdpId, amount);
      callPromise.then(function(txInfo) {
        console.log('transaction data is: ', txInfo);
        done();
      });
    });
  }, 10000); 

test('wipe Dai debt from a CDP on ganache', (done) => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {

      let cdpId = '1';
      let amount = 100;
      var callPromise = service.wipe(cdpId, amount);
      callPromise.then(function(txInfo) {
        console.log('transaction data is: ', txInfo);
        done();
      });
    });
  }, 10000);   

 test('close a CDP on ganache', (done) => {
  const service = EthereumCdpService.buildTestService();

  service.manager().authenticate()
    .then(() => {

      var cdpId = '1';
      var callPromise = contract.shut(cdpId);
      callPromise.then(function(txInfo) {
        console.log('transaction data is: ', txInfo);
        done();
      });
    });
  }, 10000);

  test('give a CDP to another address on ganache', (done) => {
    const service = EthereumCdpService.buildTestService();
  
    service.manager().authenticate()
      .then(() => {
  
        var cdpId = '1';
        var address = '0x0000000000000000000000000000000000123';
        var callPromise = contract.give(cdpId, address);
        callPromise.then(function(txInfo) {
          console.log('transaction data is: ', txInfo);
          done();
        });
      });
    }, 10000);
