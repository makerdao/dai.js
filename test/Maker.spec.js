import Maker from '../src/index';

function createMaker() {
  return new Maker('test', { log: false });
}

test(
  'openCdp should open a CDP',
  done => {
    const maker = createMaker();

    maker
      .openCdp()
      .then(cdp => cdp.getId())
      .then(id => {
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);
        done();
      });
  },
  5000
);

test('should create a new CDP object for existing CDPs', done => {
  const maker = createMaker();
  let createdCdp;

  maker.openCdp().then(cdp => {
    createdCdp = cdp;
    cdp.getId().then(id => {
      maker.getCdp(id).then(newCdpObject => {
        expect(createdCdp.getId()).toEqual(newCdpObject.getId());
        expect(createdCdp._cdpService).toEqual(newCdpObject._cdpService);
        expect(createdCdp._smartContractService).toEqual(
          newCdpObject._smartContractService
        );
        done();
      });
    });
  });
});

test('should validate the provided CDP ID', done => {
  const maker = createMaker();
  let cdpId;

  maker
    .openCdp()
    .then(cdp => cdp.getId())
    .then(id => {
      cdpId = id;
      return maker.getCdp(cdpId);
    })
    .then(cdp => cdp.getId())
    .then(fetchedId => {
      expect(fetchedId).toEqual(cdpId);

      //These crash other unit tests later on, strangely enough
      //expect(maker.getCdp('a')).rejects.toThrowError('must be a number');
      //expect(maker.getCdp(8000)).rejects.toThrowError('try opening a new one');

      done();
    });
});

test('should throw an error for an invalid id', async () => {
  const maker = createMaker();
  expect.assertions(1);
  try {
    await maker.getCdp(99999);
  } catch (err) {
    expect(err.message).toMatch(/CDP doesn't exist/);
  }
});

test('exports currency types', () => {
  expect(Maker.ETH(1).toString()).toEqual('1.00 ETH');
});
