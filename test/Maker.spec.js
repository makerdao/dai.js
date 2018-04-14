import Maker from '../src/Maker';
import ConfigFactory from '../src/utils/ConfigFactory';

let maker;

beforeAll(() => {
  maker = new Maker(
    ConfigFactory.create('decentralized-oasis-without-proxies')
  );
});

xtest('openCdp should open a CDP', done => {
  maker.openCdp().then(tx => tx.onMined()).then(cdp => cdp.getCdpId()).then(id => {
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
      done();
    });
}, 10000);

// This and the corresponding test in CDPService
// should be more robust.
// How to check Peth is really deposited?
xtest('should be able to convert eth to peth', done => {
  maker.convertEthToPeth('.1').then(tx => {
    tx.onMined()
    .then(() => {
      expect(tx).toBeTruthy();
      done();
    });
  });
});

xtest('should create a new CDP object for existing CDPs', done => {
  let createdCdp;

  maker.openCdp()
    .then(tx => tx.onMined())
    .then(cdp => {
      createdCdp = cdp;
      cdp.getCdpId()
      .then(id => {
        maker.getCdp(id).then(newCdpObject => {
          expect(createdCdp.getCdpId()).toEqual(newCdpObject.getCdpId());
          expect(createdCdp._cdpService).toEqual(newCdpObject._cdpService);
          expect(createdCdp._smartContractService).toEqual(newCdpObject._smartContractService);
          done();
        });
      });
  });
});

test('should validate the provided CDP ID', done => {
  let cdpId;
  let validCdp;
  let firstInvalidCdp;
  let secondInvalidCdp;

  const cdp = maker.openCdp().then(txn => {
    txn.onMined()
    .then(cdp => {
      cdp.getCdpId().then(id => {
        cdpId = id;
        maker.getCdp(cdpId)
        .then(cdp => {
          cdp.getCdpId().then(fetchedId => {
            expect(fetchedId).toEqual(cdpId);
            maker.getCdp('a')
            .then(response => {
              console.log(response);
            // expect(response).toEqual('ID must be a number.');
              done();
              // secondInvalidCdp = maker.getCdp(8000)
              // .then(() => {
              //   console.log(secondInvalidCdp);
              //   done();
              // });
            });
          });
        });
      });
    });
  });
});
