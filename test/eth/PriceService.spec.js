import { buildTestService } from '../helpers/serviceBuilders';

function buildTestPriceService() {
  return buildTestService('price', { price: true });
}

test('should be able to set eth price', async () => {
  const service = buildTestPriceService();
  await service.manager().authenticate();
  await service.setEthPrice('100');
  expect(await service.getEthPrice()).toEqual('100.0');
  await service.setEthPrice('400.0');
  expect(await service.getEthPrice()).toEqual('400.0');
});

test('should be able to get mkr price', done => {
  const service = buildTestPriceService();

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
  const service = buildTestPriceService();

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
  const service = buildTestPriceService();

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

test('can read the weth to peth ratio', async () => {
  const service = buildTestPriceService();
  await service.manager().authenticate();
  const ratio = await service.getWethToPethRatio();
  expect(ratio).toBeGreaterThan(0);
});
