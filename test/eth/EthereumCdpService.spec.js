import EthereumCdpService from '../../src/eth/EthereumCdpService';

let createdCdpService;

beforeAll(() => {
  return createdCdpService = EthereumCdpService.buildTestService();
});

test('should open a CDP and return cdp ID', done => {
  createdCdpService.manager().authenticate().then(() => {
    createdCdpService.openCdp()
    .onMined()
    .then(cdp => cdp.getCdpId())
    .then(id => {
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
      done();
    });
  });
}, 10000);

test('should check if a cdp for a specific id exists', done => {
  createdCdpService.manager().authenticate().then(() => {
    createdCdpService.openCdp()
    .onMined()
    .then(cdp => cdp.getCdpId())
      .then(cdpId => createdCdpService.getCdpInfo(cdpId))
        .then((result) => {
            expect(result).toBeTruthy();
            expect(result.lad).toMatch(/^0x[A-Fa-f0-9]{40}$/);
            done();
          });
        });
}, 10000);

test('should open and then shut a CDP', done => {
  createdCdpService.manager().authenticate().then(() => {
    createdCdpService.openCdp()
    .onMined()
    .then(cdp => {
      cdp.getCdpId()
      .then(id => {
        createdCdpService.getCdpInfo(id)
        .then(firstInfoCall => {
          createdCdpService.shutCdp(id)
          .catch((err) => { 
            done.fail(new Error('shutting CDP had an error: ', err));
          })
          .then(() => {  
            createdCdpService.getCdpInfo(id)
            .then(secondInfoCall => {
              expect(firstInfoCall).not.toBe(secondInfoCall);
              expect(secondInfoCall.lad).toBe('0x0000000000000000000000000000000000000000');
              done();
            });
          });
        });
      });
    });
  });
}, 12000);

test('should convert .1 eth to peth', done => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      service.convertEthToPeth('.1')
      .then((result) => {
        expect(result).toBeTruthy();    
        done();
      });
    });
}, 10000);

test('should be able to lock eth in a cdp', done => {
  const service = EthereumCdpService.buildTestService();
  let firstInfoCall;
  let cdpId;

  service.manager().authenticate().then(() => {
    const cdp = service.openCdp();
    cdp._businessObject.getCdpId().then(id => {
      cdpId = id;
      service.getCdpInfo(id)
      .then(result => firstInfoCall = result)
      .then(() => service.lockEth(id, '.1'))
      .then(txn => {
        txn.onMined()
        service.getCdpInfo(cdpId)
        .then(secondInfoCall => {
          expect(firstInfoCall.ink.toString()).toEqual('0');
          expect(secondInfoCall.ink.toString()).toEqual('100000000000000000');
          done();
        })
      });
    });
  });
}, 10000);
