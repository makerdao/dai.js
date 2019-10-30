import { migrationMaker } from '../helpers';
import { ServiceRoles, Migrations } from '../../src/constants';

let maker, migration;

async function mockCdpIds({ forAccount, forProxy } = {}) {
  const currentAddress = maker.currentAddress();
  const currentProxy = await maker.currentProxy();

  maker.service('cdp').getCdpIds = jest.fn().mockImplementation(addr => {
    if (addr === currentAddress) {
      return forAccount || [];
    } else if (addr === currentProxy) {
      return forProxy || [];
    } else {
      return [];
    }
  });
}

describe('SCD to MCD CDP Migration', () => {
  beforeAll(async () => {
    maker = await migrationMaker();
    const service = maker.service(ServiceRoles.MIGRATION);
    migration = service.getMigration(Migrations.SINGLE_TO_MULTI_CDP);
  });

  test('if there are no cdps, return false', async () => {
    await mockCdpIds();

    expect(await migration.check()).toMatchObject({});
  });

  test('if there are cdps owned by a proxy, but no cdps owned by the account, return true', async () => {
    await mockCdpIds({ forProxy: [{ id: '123' }] });
    expect(await migration.check()).toMatchObject({
      [await maker.currentProxy()]: [{ id: '123' }],
      [maker.currentAddress()]: []
    });
  });

  test('if there are cdps owned by the account, but no cdps owned by a proxy, return true', async () => {
    await mockCdpIds({ forAccount: [{ id: '123' }] });
    expect(await migration.check()).toMatchObject({
      [await maker.currentProxy()]: [],
      [maker.currentAddress()]: [{ id: '123' }]
    });
  });

  test('if there are both cdps owned by the account and proxy, return true', async () => {
    await mockCdpIds({
      forAccount: [{ id: '123' }],
      forProxy: [{ id: '234' }]
    });
    expect(await migration.check()).toMatchObject({
      [await maker.currentProxy()]: [{ id: '234' }],
      [maker.currentAddress()]: [{ id: '123' }]
    });
  });
});
