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
      // eslint-disable-next-line
      console.log(price);
      done();
    });
  });
});