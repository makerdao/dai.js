const Maker = require('../dist');

/*These tests are meant to catch errors in the Babel compilation
process and/or package.json, since the other Jest tests run
against the original source.*/

async function createMaker() {
  return Maker.create('test', { log: false });
}

test('can get a service from maker', async () => {
  const maker = await createMaker();
  const ethCdp = maker.service('cdp');
  expect(ethCdp).toBeDefined();
});

test('can open a CDP, lock eth and draw dai', async () => {
  const maker = await createMaker();
  const cdp = await maker.openCdp();
  await cdp.lockEth(0.01);
  const initialDebt = await cdp.getDebtValue();
  await cdp.drawDai(0.1);
  const currentDebt = await cdp.getDebtValue();
  expect(currentDebt.toNumber()).toBeGreaterThan(initialDebt.toNumber());
});
