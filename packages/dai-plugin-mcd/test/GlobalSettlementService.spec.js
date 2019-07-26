import { mcdMaker } from './helpers';
import { ServiceRoles } from '../src/constants';

let service;

describe('Global Settlement Service', () => {
  beforeAll(async () => {
    const maker = await mcdMaker();
    service = maker.service(ServiceRoles.GLOBAL_SETTLEMENT);
  });

  test('isInProgress should return false when no global settlement is in progress', async () => {
    expect(await service.isInProgress()).toBeFalsy();
  });

  // would love to test kicking off global settlement, but would need authed access.
});
