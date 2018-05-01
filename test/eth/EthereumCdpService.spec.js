import EthereumCdpService from '../../src/eth/EthereumCdpService';
import Web3ServiceList from '../../src/utils/Web3ServiceList';

let createdCdpService;

beforeAll(() => {
  return createdCdpService = EthereumCdpService.buildTestService();
});

afterEach(() => {
  Web3ServiceList.disconnectAll();
});

test('should open a CDP and get cdp ID', done => {
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
}, 20000);

xtest('should open and then shut a CDP with peth locked in it', done => {
  let firstInfoCall;

  createdCdpService.manager().authenticate().then(() => {
    createdCdpService.openCdp()
    .onMined()
    .then(cdp => {
      cdp.getCdpId()
      .then(id => {
        createdCdpService.getCdpInfo(id)
        .then(info => firstInfoCall = info)
        .then(() => cdp.lockEth('0.1'))
        .then(txn => txn.onMined())
        .then(() => {
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
}, 20000);

test('should be able to lock eth in a cdp', done => {
  let firstInfoCall;
  let cdpId;

  createdCdpService.manager().authenticate().then(() => {
    const cdp = createdCdpService.openCdp();
    cdp._businessObject.getCdpId().then(id => {
      cdpId = id;
      createdCdpService.getCdpInfo(id)
      .then(result => firstInfoCall = result)
      .then(() => createdCdpService.lockEth(id, '0.1'))
      .then(txn => {
        txn.onMined();
        createdCdpService.getCdpInfo(cdpId)
        .then(secondInfoCall => {
          expect(firstInfoCall.ink.toString()).toEqual('0');
          expect(secondInfoCall.ink.toString()).toEqual('100000000000000000');
          done();
        });
      });
    });
  });
}, 20000);

xtest('should be able to free peth from a cdp', done => {
  let newCdp;
  let firstBalance;
  let cdpId;

  createdCdpService.manager().authenticate().then(() => {
    createdCdpService.openCdp().onMined()
    .then(cdp => {
      newCdp = cdp;
      newCdp.getCdpId().then(id => cdpId = id)
      .then(() => createdCdpService.lockEth(cdpId, '0.1'))
      .then(txn => txn.onMined())
      .then(() => {
        newCdp.getInfo().then(info => firstBalance = parseFloat(info.ink))
        .then(() => {
          createdCdpService.freePeth(cdpId, '0.1')
          .then(txn => txn.onMined())
          .then(() => {
            newCdp.getInfo().then(info => {
              expect(parseFloat(info.ink)).toBeCloseTo(firstBalance - 100000000000000000);
              done();
            });
          });
        });
      });
    });
  });
}, 30000);