import { mcdMaker } from './helpers';
import { ServiceRoles } from '../src/constants';
import { ETH } from '../src';

let maker, service;

beforeAll(async () => {
  maker = await mcdMaker();
  jest.setTimeout(8000);
});

test('getCdpType with no matches throws an error', () => {
  service = maker.service(ServiceRoles.CDP_TYPE);
  expect(() => {
    service.getCdpType('FOO');
  }).toThrowError(/matches no cdp type/);
});

test('getCdpType with too many matches throws an error', () => {
  service = maker.service(ServiceRoles.CDP_TYPE);
  expect(() => {
    service.getCdpType(ETH);
  }).toThrowError(/matches more than one cdp type/);
});
