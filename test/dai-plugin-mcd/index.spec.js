import Maker from '../../src';
import McdPlugin from '../../lib/dai-plugin-mcd/src';

test('MCD contract address mapping', async () => {
  const maker = Maker.create('test', {
    plugins: [McdPlugin],
    log: false
  });

  await maker.authenticate();

  const address = maker
    .service('smartContract')
    .getContractAddressByName('PIP_DGX');
  expect(address).toEqual('0x174666d4101f6294eba19d0846ec85176d28f2e6');
});
