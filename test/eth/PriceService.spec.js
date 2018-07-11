import { buildTestService } from '../helpers/serviceBuilders';
import { Currency, ETH } from '../../src/eth/Currency';

function buildTestPriceService() {
  return buildTestService('price', { price: true });
}

test('should return current eth price', async () => {
  const service = buildTestPriceService();

  await service.manager().authenticate();
  const price = await service.getEthPrice();
  expect(price.toString()).toEqual('400.00 ETH');
});

test('should be able to set eth price', async () => {
  const service = buildTestPriceService();
  await service.manager().authenticate();
  await service.setEthPrice('100');
  expect((await service.getEthPrice()).toString()).toEqual('100.00 ETH');
  await service.setEthPrice('400.0');
  expect((await service.getEthPrice()).toString()).toEqual('400.00 ETH');
});

test('should be able to get mkr price', done => {
  const service = buildTestPriceService();

  service
    .manager()
    .authenticate()
    .then(() => {
      service.getMkrPrice().then(price => {
        expect(price.toString()).toEqual('0.00 MKR');
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
          expect(price.toString()).toEqual('100.00 MKR');
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
        expect(value instanceof Currency).toBeTruthy();
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

test('_valueForContract', async () => {
  const service = buildTestPriceService();
  await service.manager().authenticate();
  const value = service._valueForContract('43', ETH);
  expect(value).toBe(
    '0x00000000000000000000000000000000000000000000000254beb02d1dcc0000'
  );

  const value2 = service._valueForContract('78901', ETH);
  expect(value2).toBe(
    '0x0000000000000000000000000000000000000000000010b53b55f895f7b40000'
  );
});
