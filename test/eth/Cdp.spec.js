import EthereumCdpService from '../../src/eth/EthereumCdpService';
import Cdp from '../../src/eth/Cdp';

let service;

beforeAll(() => {
  service = EthereumCdpService.buildTestService();
  service.manager().authenticate();
})

test('should create a CDP service automatically', done => {
  const newCdp = new Cdp();
  console.log(newCdp._ethersProvider);
  done();
})

xtest('should create a cdp object with an authenticated service and a cdp id', done => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      service.openCdp()
      .catch(err => {
        done.fail(new Error('error opening CDP: ', err));
      })
      .then(cdpId => {
        console.log(service);
        const cdp = new Cdp(service, cdpId);
        
        expect(cdp).toBeDefined();
        expect(cdp._service).toBeDefined();
        expect(cdp._id).toBeGreaterThan(0);
        done();
      });
    });
});

xtest('should be able to open a new CDP', done => {
  const newCdp = new Cdp(service);
  console.log(newCdp);
  done();
})

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
