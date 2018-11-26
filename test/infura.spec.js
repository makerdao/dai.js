import Maker from '../src/index';

test('use Kovan via Infura without API key', async () => {
  const maker = Maker.create('kovan', { log: false });
  await maker.authenticate();
});
