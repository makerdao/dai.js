import { ETH, USD_ETH, USD_MKR, USD_PETH } from '../src/Currency';
import { scdMaker } from './helpers/maker';
import { ServiceRoles } from '../src/utils/constants';

let priceService;

beforeAll(async () => {
  const maker = await scdMaker();
  priceService = await maker.service(ServiceRoles.PRICE);
});
test('should return current eth price', async () => {
  const price = await priceService.getEthPrice();
  expect(price).toEqual(USD_ETH(400));
});

test('should be able to set eth price', async () => {
  await priceService.setEthPrice(100);
  expect(await priceService.getEthPrice()).toEqual(USD_ETH(100));
  await priceService.setEthPrice(400);
  expect(await priceService.getEthPrice()).toEqual(USD_ETH(400));
});

test('should be able to get mkr price', async () => {
  const mkrPrice = await priceService.getMkrPrice();
  expect(mkrPrice.gt(USD_MKR(0))).toBeTruthy();
});

test('should be able to set mkr price', async () => {
  await priceService.setMkrPrice('777');
  const price = await priceService.getMkrPrice();
  expect(price).toEqual(USD_MKR(777));
});

test('should return the peth price', async () => {
  const pethPrice = await priceService.getPethPrice();
  expect(USD_PETH.isInstance(pethPrice)).toBeTruthy();
});

test('can read the weth to peth ratio', async () => {
  const ratio = await priceService.getWethToPethRatio();
  expect(ratio).toBeGreaterThan(0);
});

test('_valueForContract', async () => {
  const value = priceService._valueForContract('43', ETH);
  expect(value).toBe(
    '0x00000000000000000000000000000000000000000000000254beb02d1dcc0000'
  );

  const value2 = priceService._valueForContract('78901', ETH);
  expect(value2).toBe(
    '0x0000000000000000000000000000000000000000000010b53b55f895f7b40000'
  );
});
