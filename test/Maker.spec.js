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

test('should create a new CDP object for existing CDPs', done => {
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

  maker.openCdp().then(txn => {
    txn.onMined()
    .then(cdp => {
      cdp.getCdpId().then(id => {
        cdpId = id;
        maker.getCdp(cdpId)
        .then(cdp => {
          cdp.getCdpId().then(fetchedId => {
            expect(fetchedId).toEqual(cdpId);
            expect(maker.getCdp('a')).rejects.toThrowError('must be a number');
            expect(maker.getCdp(8000)).rejects.toThrowError('try opening a new one');
            done();
          });
        });
      });
    });
  });
});
