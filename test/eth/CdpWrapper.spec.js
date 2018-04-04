import EthereumCdpService from '../../src/eth/EthereumCdpService';
import CdpWrapper from '../../src/eth/CdpWrapper';

test('should create a cdp object with an authenticated service and a cdp id', done => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      service.openCdp()
      .catch(err => {
        done.fail(new Error('error opening CDP'))
      })
      .then(cdpId => {
        const cdp = new CdpWrapper(service, cdpId);
        
        expect(cdp).toBeDefined();
        expect(cdp._service).toBeDefined();
        expect(cdp._id).toBeGreaterThan(0);
        done();
      });
    });
}, 10000);
