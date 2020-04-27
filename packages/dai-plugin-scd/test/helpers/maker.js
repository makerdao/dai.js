import Maker from '../../../dai/src';
import ScdPlugin from '../../src';

export async function scdMaker({
  preset = 'test',
  network = 'testnet',
  log = false,
  addressOverrides,
  ...settings
} = {}) {
  const maker = await Maker.create(preset, {
    plugins: [[ScdPlugin, { addressOverrides, network }]],
    web3: {
      pollingInterval: 100
    },
    log,
    ...settings
  });
  await maker.authenticate();
  return maker;
}
