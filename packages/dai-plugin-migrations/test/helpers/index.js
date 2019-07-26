import Maker from '@makerdao/dai';
import MigrationPlugin from '../../src';
import McdPlugin from '../../../dai-plugin-mcd/src';

export async function migrationMaker({
  preset = 'test',
  network = 'testnet',
  addressOverrides,
  ...settings
} = {}) {
  const maker = await Maker.create(preset, {
    plugins: [
      [McdPlugin, { network }],
      [MigrationPlugin, { addressOverrides, network }]
    ],
    log: false,
    ...settings
  });
  await maker.authenticate();
  return maker;
}
