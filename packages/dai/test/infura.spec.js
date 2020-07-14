import Maker from '../src/index';

test('use Kovan via Infura without project id throws', async () => {
  try {
    const maker = await Maker.create('kovan');
    await maker.authenticate();
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }
});
