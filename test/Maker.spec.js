import Maker from '../src/Maker';
import ConfigFactory from '../src/utils/ConfigFactory';

let maker;

beforeAll(() => {
  maker = new Maker(
    ConfigFactory.create('decentralized-oasis-without-proxies')
  );
});

test('openCdp should open a CDP', done => {
  maker.openCdp().then(tx => tx.onMined()).then(cdp => cdp.getCdpId()).then(id => {
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
      done();
    });
}, 10000);

// This and the corresponding test in CDPService
// should be more robust.
// How to check Peth is really deposited?
test('should be able to convert eth to peth', done => {
  maker.convertEthToPeth('.1').then(tx => {
    tx.onMined()
    .then(() => {
      expect(tx).toBeTruthy();
      done();
    });
  });
});

test('should create a new CDP object for existing CDPs', done => {
  let createdCdp;

  maker.openCdp()
    .then(tx => tx.onMined())
    .then(cdp => {
      createdCdp = cdp;
      cdp.getCdpId()
      .then(id => {
        maker.cdp(id).then(newCdpObject => {
          expect(createdCdp.getCdpId()).toEqual(newCdpObject.getCdpId());
          expect(createdCdp._cdpService).toEqual(newCdpObject._cdpService);
          expect(createdCdp._smartContractService).toEqual(newCdpObject._smartContractService);
          done();
        });
      });
  });
});
