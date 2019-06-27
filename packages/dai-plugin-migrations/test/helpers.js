import Maker from '@makerdao/dai';
import MigrationPlugin from '../src';

export async function migrationMaker({
  preset = 'test',
  network = 'testnet',
  addressOverrides,
  ...settings
} = {}) {
  const maker = await Maker.create(preset, {
    plugins: [[MigrationPlugin, { addressOverrides, network }]],
    log: false,
    ...settings
  });
  await maker.authenticate();
  return maker;
}
