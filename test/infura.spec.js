import Maker from '../src/index';

test('use Kovan via Infura without project id throws', async () => {
  try {
    const maker = await Maker.create('kovan', { log: false });
    await maker.authenticate();
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }
});
