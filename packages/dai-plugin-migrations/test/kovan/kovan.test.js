import Maker from '@makerdao/dai';
import McdPlugin from '@makerdao/dai-plugin-mcd';
import MigrationPlugin from '../../src';
import { SAI, MKR } from '../../src';
import { ServiceRoles, Migrations } from '../../src/constants';

async function mcdMaker({
  preset = 'kovan',
  network = 'kovan',
  prefetch = true,
  log = true,
  addressOverrides,
  ...settings
} = {}) {
  const maker = await Maker.create(preset, {
    privateKey: process.env.PRIVATE_KEY,
    plugins: [
      [McdPlugin, { addressOverrides, network, prefetch }],
      [MigrationPlugin, { addressOverrides, network }]
    ],
    web3: {
      transactionSettings: {
        gasPrice: 15000000000
      },
      provider: {
        infuraProjectId: 'c3f0f26a4c1742e0949d8eedfc47be67'
      }
    },
    log,
    addressOverrides: {'MCD_JOIN_ETH_B': '0x0', 'MCD_JOIN_ZRX_A': '0x0' },
    ...settings
  });
  await maker.authenticate();
  return maker;
}

async function openLockAndDrawScdCdp(drawAmount, maker) {
  const cdp = await maker.openCdp({ dsProxy: true });
  await cdp.lockEth('0.1', { dsProxy: true });
  await cdp.drawDai(drawAmount, { dsProxy: true });
  return cdp;
}

test('kovan', async () => {
  const maker = await mcdMaker();
  const sai = maker.getToken(SAI);
  const mkr = maker.getToken(MKR);
  const migrationContract = maker
    .service('smartContract')
    .getContract('MIGRATION');
  const migration = maker
    .service(ServiceRoles.MIGRATION)
    .getMigration(Migrations.SINGLE_TO_MULTI_CDP);
  const proxyAddress = await maker.service('proxy').currentProxy();

  // await sai.approveUnlimited(migrationContract.address);
  // await sai.approveUnlimited(proxyAddress);
  // await mkr.approveUnlimited(migrationContract.address);
  // await mkr.approveUnlimited(proxyAddress);

  const cdp = await openLockAndDrawScdCdp('1', maker);
  const info = await cdp.getInfo();
  await cdp.give(proxyAddress);
  const id = cdp.id;
  await migrationContract.swapSaiToDai('5000000000000000000');

  let error;
  try {
    await migration.execute(id);
  } catch (err) {
    error = err;
    console.error(err);
  }

  expect(error).not.toBeDefined();
}, 120000);
