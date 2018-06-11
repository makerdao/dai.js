import PriceFeedService from '../../src/eth/PriceFeedService';

test('should return current eth price', done => {
  const service = PriceFeedService.buildTestService();

  service
    .manager()
    .authenticate()
    .then(() => {
      service.getEthPrice().then(price => {
        expect(price).toEqual('400.0');
        done();
      });
    });
});

test('should be able to set eth price', done => {
  const service = PriceFeedService.buildTestService();

  service
    .manager()
    .authenticate()
    .then(() => {
      service
        .setEthPrice('100')
        .then(() => service.getEthPrice())
        .then(price => {
          expect(price).toEqual('100.0');
          service.setEthPrice('400.0').then(() => done());
        });
    });
});

test('should be able to get mkr price', done => {
  const service = PriceFeedService.buildTestService();

  service
    .manager()
    .authenticate()
    .then(() => {
      service.getMkrPrice().then(price => {
        expect(price).toEqual('0.0');
        done();
      });
    });
});

test('should be able to set mkr price', done => {
  const service = PriceFeedService.buildTestService();

  service
    .manager()
    .authenticate()
    .then(() => {
      service
        .setMkrPrice('100')
        .then(() => service.getMkrPrice())
        .then(price => {
          expect(price).toEqual('100.0');
          service.setMkrPrice('0.0').then(() => done());
        });
    });
});

test('should return the peth price', done => {
  const service = PriceFeedService.buildTestService();

  service
    .manager()
    .authenticate()
    .then(() => {
      service.getPethPrice().then(value => {
        expect(typeof value).toBe('number');
        done();
      });
    });
});
