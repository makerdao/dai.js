import PriceFeedService from '../../src/eth/PriceFeedService';

test('should return current eth price', done => {
  const service = PriceFeedService.buildTestService();

  service.manager().authenticate().then(() => {
    service.getEthPrice().then(price => {
      expect(price).toEqual('400.0');
      done();
    });
  });
});

test('should be able to set eth price', done => {
  const service = PriceFeedService.buildTestService();
  
  service.manager().authenticate().then(() => {
    service.setEthPrice('100').then(() => {
      service.getEthPrice().then(price => {
        expect(price).toEqual('100.0');
        service.setEthPrice('400.0').then(() => done());
      });
    });
  });
});
