import EthereumCdpService from '../../src/eth/EthereumCdpService';
import Cdp from '../../src/eth/Cdp';

test('should create a cdp object with an authenticated service and a cdp id', done => {
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

test('shut CDP should have an \'onMined\' event', done => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      service.openCdp()
      .then(cdpId => {
        const cdp = new Cdp(service, cdpId);
        const transaction = cdp.shut();
        transaction.onMined().then(() => {
          expect(transaction._state._state).toBe('mined');
          done();
        });
      });
    });
}, 20000);
