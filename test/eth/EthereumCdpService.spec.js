import EthereumCdpService from '../../src/eth/EthereumCdpService';
import SmartContractService from '../../src/eth/SmartContractService';
import contracts from '../../contracts/contracts';

test('open a CDP on ganache', (done) => {
  const service = EthereumCdpService.buildTestService();
  console.log(service.get('smartContract'));


  service.manager().connect()
    .then(() => {
      console.log(service.get('smartContract'));
      var contract = this.get('smartContract').getContractByName(contracts.TUB);
      console.log(contract);

      // open a CDP
      var callPromise = EthereumCdpService.open();
      callPromise.then(function(txInfo) {
        console.log('transaction data is: ', txInfo);
        done();
      });
    });
  }); 

  test('close a CDP on ganache', (done) => {
    
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
    }); 
