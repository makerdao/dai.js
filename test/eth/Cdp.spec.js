import EthereumCdpService from '../../src/eth/EthereumCdpService';
import Cdp from '../../src/eth/Cdp';

xtest('should create a cdp object with an authenticated service and a cdp id', done => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      service.openCdp()
      .catch(err => {
        done.fail(new Error('error opening CDP: ', err));
      })
      .then(cdpId => {
        const cdp = new Cdp(service, cdpId);
        
        expect(cdp).toBeDefined();
        expect(cdp._service).toBeDefined();
        expect(cdp._id).toBeGreaterThan(0);
        done();
      });
    });
});

test('it should update state to \'pending\' when a CDP is shut', done => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      service.openCdp()
      .then(cdpId => {
        const cdp = new CdpWrapper(service, cdpId);
        cdp.shut()
        .then(() => {
          expect(cdp._state._state).toBe('pending');
          done();
        })
      })
    })
}, 20000);

xtest('it should update state to \'mined\' when a CDP is shut', done => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      service.openCdp()
      .then(cdpId => {
        const cdp = new CdpWrapper(service, cdpId);
        cdp.shut()
        .then(() => {
          // trigger 'mined'
          done();
        })
      })
    })
});
