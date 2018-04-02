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

test('should shut an open CDP and return True if successful', done => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      service.openCdp()
        .then(cdpId => {
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
