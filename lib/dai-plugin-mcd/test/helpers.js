import Maker from '@makerdao/dai';
import McdPlugin from '../src';

export async function mcdMaker(settings) {
  const maker = Maker.create('test', {
    plugins: [McdPlugin],
    log: false,
    ...settings
  });
  await maker.authenticate();
  return maker;
}
