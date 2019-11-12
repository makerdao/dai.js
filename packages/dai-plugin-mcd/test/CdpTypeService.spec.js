import { mcdMaker } from './helpers';
import { ServiceRoles } from '../src/constants';
import { ETH } from '../src';

let maker, service;

beforeAll(async () => {
  maker = await mcdMaker();
  service = maker.service(ServiceRoles.CDP_TYPE);
});

test('getCdpType with no matches throws an error', () => {
  expect(() => {
    service.getCdpType('FOO');
  }).toThrowError(/matches no cdp type/);
});

xtest('getCdpType with too many matches throws an error', () => {
  expect(() => {
    service.getCdpType(ETH);
  }).toThrowError(/matches more than one cdp type/);
});

test('prefetch all cdpTypes', async () => {
  service.resetAllCdpTypes();
  await service.prefetchAllCdpTypes();
  expect(() => {
    service.totalDebtAllCdpTypes;
  }).not.toThrowError();
});
