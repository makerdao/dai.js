import EthereumCdpService from '../../src/eth/EthereumCdpService';
import Cdp from '../../src/eth/Cdp';

function buildService() {
  const service = EthereumCdpService.buildTestService();
  return service.manager().authenticate().then(() => service);
}

test('should open a new CDP and return its ID', done => {
  buildService().then(service => {
    const newCdp = new Cdp(service.get('smartContract'));
    newCdp.getCdpId().then(id => {
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
      done();
    });
  });
});

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

xtest('should be able to get a CDP\'s info', done => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      service.openCdp()
      .catch(err => {
        done.fail(new Error('error opening CDP: ', err));
      })
      .then(cdpId => {
        const cdp = new Cdp(service, cdpId);
        cdp.getInfo().then(info => {
          expect(info).toBeDefined();
          expect(typeof info).toBe('object');
          done();
        });
      });
    });
}, 10000);

xtest('should be able to close a CDP', done => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      service.openCdp()
      .then(cdpId => {
        const cdp = new Cdp(service, cdpId);
        const transaction = cdp.shut();
        transaction.onMined().then(() => {
          cdp.getInfo().then(info => {
            expect((info['0'][0])).toBe('0');
            done();
          });
        });
      });
    });
}, 20000);

xtest('should have an \'onMined\' event when a user shuts a CDP', done => {
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
}, 10000);
