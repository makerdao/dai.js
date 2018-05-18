import PriceFeedService from '../../src/eth/PriceFeedService';

xtest('should be able to set eth price', done => {
  const service = PriceFeedService.buildTestService();
  
  service.manager().authenticate().then(() => {
    service.setEthPrice('100').then(() => {
      service.setEthPrice('400').then(() => done());
    });
  });
});

test('should return current eth price', done => {
  const service = PriceFeedService.buildTestService();

  service.manager().authenticate().then(() => {
    service.getEthPrice().then(price => {
      expect(price).toEqual('400.0');
      done();
    });
  });
});