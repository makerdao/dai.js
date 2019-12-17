import { migrationMaker } from '../helpers';
import { ServiceRoles, Migrations } from '../../src/constants';
import {
  takeSnapshot,
  restoreSnapshot,
  TestAccountProvider
} from '@makerdao/test-helpers';
import { MKR } from '../../src';
import voteProxyAbi from '../../contracts/abis/VoteProxy.json';

let maker, migration, snapshot;

describe('Chief Migration', () => {
  beforeAll(async () => {
    maker = await migrationMaker();
    const service = maker.service(ServiceRoles.MIGRATION);
    migration = service.getMigration(Migrations.CHIEF_MIGRATE);
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot(maker);
  });

  afterEach(() => {
    restoreSnapshot(snapshot, maker);
  });

  test('if the account has no MKR locked in old chief, return 0', async () => {
    const { mkrLockedDirectly, mkrLockedViaProxy } = await migration.check();
    expect(mkrLockedDirectly.toNumber()).toBe(0);
    expect(mkrLockedViaProxy.toNumber()).toBe(0);
  });

  test('if the account has some MKR locked directly in old chief, return the amount', async () => {
    const oldChief = maker
      .service('smartContract')
      .getContractByName('OLD_CHIEF');

    await maker
      .service('token')
      .getToken(MKR)
      .approveUnlimited(oldChief.address);

    const LOCK_AMOUNT = MKR('5.123456789123456789');
    await oldChief.lock(LOCK_AMOUNT.toFixed('wei'));

    const { mkrLockedDirectly, mkrLockedViaProxy } = await migration.check();
    expect(mkrLockedDirectly.isEqual(LOCK_AMOUNT)).toBeTruthy();
    expect(mkrLockedViaProxy.toNumber()).toBe(0);
  });

  test('if the account has some MKR locked via proxy in old chief, return the amount', async () => {
    const oldVoteProxyFactory = maker
      .service('smartContract')
      .getContractByName('OLD_VOTE_PROXY_FACTORY');

    const coldAccount = maker.currentAccount();
    const hotAccount = TestAccountProvider.nextAccount();
    await maker.addAccount({ ...hotAccount, type: 'privateKey' });

    // initiate from cold
    maker.useAccount('default');
    await oldVoteProxyFactory.initiateLink(hotAccount.address);

    // switch to hot
    maker.useAccount(hotAccount.address);
    await oldVoteProxyFactory.approveLink(coldAccount.address);

    // and back to cold
    maker.useAccount('default');
    const voteProxyAddress = await migration._getVoteProxyAddress(
      coldAccount.address
    );

    const voteProxy = maker
      .service('smartContract')
      .getContractByAddressAndAbi(voteProxyAddress, voteProxyAbi);

    await maker
      .service('token')
      .getToken(MKR)
      .approveUnlimited(voteProxyAddress);

    const LOCK_AMOUNT = MKR('5.123456789123456789');
    await voteProxy.lock(LOCK_AMOUNT.toFixed('wei'));

    const { mkrLockedDirectly, mkrLockedViaProxy } = await migration.check();
    expect(mkrLockedDirectly.toNumber()).toBe(0);
    expect(mkrLockedViaProxy.isEqual(LOCK_AMOUNT)).toBeTruthy();
  });
});
