import EthereumCdpService from '../../src/eth/EthereumCdpService';
import contracts from '../../contracts/contracts';

let cdpId;
let service;
var contract;
var tubContract;
var ethersUtils;

beforeAll( (done) => {
  service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      contract = service.get('smartContract');
      tubContract = contract.getContractByName(contracts.TUB);
      ethersUtils = contract.get('web3').ethersUtils();

      // Create a promise that resolves when the event is triggered
      var seq = Promise.resolve();

      var eventPromise = new Promise(function(resolve, reject) {
          tubContract.onlognewcup = function(address, cdpIdBytes32) {
              resolve(cdpIdBytes32);
              this.removeListener();
          };
      });

      // open CDP
      seq = seq.then(function() {
        var callPromise = service.openCdp();
        callPromise.then(function(txInfo) {
        });
      });
    
      // Wait for the eventPromise to be triggered
      seq = seq.then(function() {
        return eventPromise.then(function(cdpIdBytes32) {
            cdpId = ethersUtils.bigNumberify(cdpIdBytes32).toNumber();
            console.log('Open CDP event was triggered with cdpId: ', cdpId) 
            done();
            });
          });
      });
  }, 10000);

  test('lock ETH in CDP on ganache', (done) => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      let cdpId = '1';
      let amount = 100;


      console.log('service is', service);
      var callPromise2 = service.lockEth(cdpId, amount);
      console.log(callPromise2);
      callPromise2.then(function(txInfo) {
        console.log('CDP lock ETH transaction data is: ', txInfo);
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
        //console.log('transaction data is: ', txInfo);
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
        //console.log('transaction data is: ', txInfo);
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
        //console.log('transaction data is: ', txInfo);
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
        //console.log('transaction data is: ', txInfo);
        done();
      });
    });
}, 10000);  

test.only('close a CDP on ganache', (done) => {
      console.log('closing cdpId: ',  cdpId);

      var cdpIdBytes32 = ethersUtils.hexlify(cdpId);
      var estimatePromise = tubContract.estimate.shut(cdpIdBytes32);

      // let address2 = '0x81431b69b1e0e334d4161a13c2955e0f3599381e';
      // var estimatePromise = tubContract.estimate.give(cdpIdBytes32, address2);   doesnt work either
      return estimatePromise.then(function(gasCost) {
      // gasCost is returned as BigNumber
      console.log('Estimated Gas Cost: ' + gasCost.toString());
      });

      /* var callPromise2 = service.shut(cdpId);
      callPromise2.then(function(txInfo) {
        console.log(txInfo);
        done();
      }); */
}, 10000);


test('give a CDP to another address on ganache', (done) => {
  const service = EthereumCdpService.buildTestService();
  
  service.manager().authenticate()
    .then(() => {
  
      var cdpId = 1;
      var address = '0x0000000000000000000000000000000000000123';
      var callPromise = service.give(cdpId, address);
      callPromise.then(function(txInfo) {
        console.log('transaction data is: ', txInfo);
        done();
      });
    });
}, 10000); 
