const Maker = require('../dist/src');

async function createMaker(privateKey) {
  return Maker.create('test', { privateKey, log: false });
}

test('can get a service from maker from the dist folder', async () => {
  const maker = await createMaker();
  const ethCdp = maker.service('cdp');
  expect(!!ethCdp).toBe(true);
});
