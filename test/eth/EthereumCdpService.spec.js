import EthereumCdpService from '../../src/eth/EthereumCdpService';

let createdCdpId;

test('should open a CDP and return cdp ID', done => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      service.openCdp()
        .then(cdpId => {
          createdCdpId = cdpId; 
          expect(cdpId).toBeGreaterThan(0);
          expect(typeof cdpId).toBe('number');
          done();
        });
    });
});

test('should check if a cdp for a specific id exists', done => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      service.getCdpInfo(createdCdpId).then((result) => {
        expect(result).toBeTruthy();
        done();
      });
    });
});

test('should open and then shut a CDP', done => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      service.openCdp()
        .then((cdpId) => {
          service.shutCdp(cdpId)
          .catch((err) => { 
            done.fail(new Error('shutting CDP had an error: ', err));
          })
          .then((result) => {  
            expect(result).toBeFalsy();    //result is undefined from shutting a cdp.  it doesn't return anything or log anything
            expect(typeof result).toBe('undefined');
            done();
          });
        });
      });
}, 8000);
