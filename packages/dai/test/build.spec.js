const Maker = require('../dist/src');

/*These tests are meant to catch errors in the Babel compilation
process and/or package.json, since the other Jest tests run
against the original source.*/

async function createMaker() {
  return Maker.create('test', { log: false });
}

test('can get a service from maker', async () => {
  const maker = await createMaker();
  const proxy = maker.service('proxy');
  expect(proxy).toBeDefined();
});
