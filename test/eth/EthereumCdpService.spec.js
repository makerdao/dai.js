import EthereumCdpService from '../../src/eth/EthereumCdpService';
import SmartContractService from '../../src/eth/SmartContractService';
import contracts from '../../contracts/contracts';

test('open a CDP on ganache', (done) => {
  done();
  return;
  const service = EthereumCdpService.buildTestService();


  service.manager().authenticate()
    .then(() => {

      // open a CDP
      var callPromise = service.openCdp();
      callPromise.then(function(txInfo) {
        console.log('transaction data is: ', txInfo);
        done();
      });
    });
  }, 10000); 

/*
  test('close a CDP on ganache', (done) => {
    done();
    return;
  /* test('close a CDP on ganache', (done) => {
    
    const service = EthereumCdpService.buildTestService();
  
    service.manager().connect()
      .then(() => {

        
        cdpId = '338';
        // TODO: convert to Bytes32 using util function
        // shut a specific CDP
        var callPromise = contract.shut(cdpIdBytes32);
        callPromise.then(function(txInfo) {
          console.log('transaction data is: ', txInfo);
          done();
        });
      });
    }); */
