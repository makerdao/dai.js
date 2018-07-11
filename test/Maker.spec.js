import Maker, { ETH, LocalService } from '../src/index';
const Maker2 = require('../src/index');

function createMaker() {
  return new Maker('test', { log: false });
}

test('import vs require', () => {
  expect(Maker2).toEqual(Maker);
  expect(Maker2.ETH).toEqual(ETH);
  expect(Maker2.LocalService).toEqual(LocalService);
});

test('openCdp', async () => {
  const maker = createMaker();

  const cdp = await maker.openCdp();
  const id = await cdp.getId();
  expect(typeof id).toBe('number');
  expect(id).toBeGreaterThan(0);
});

test('creates a new CDP object for existing CDPs', async () => {
  const maker = createMaker();
  const cdp = await maker.openCdp();
  const id = await cdp.getId();
  const newCdp = await maker.getCdp(id);
  expect(id).toEqual(await newCdp.getId());
  expect(cdp._cdpService).toEqual(newCdp._cdpService);
  expect(cdp._smartContractService).toEqual(newCdp._smartContractService);
});

test('throws an error for an invalid id', async () => {
  const maker = createMaker();
  expect.assertions(1);
  try {
    await maker.getCdp(99999);
  } catch (err) {
    expect(err.message).toMatch(/CDP doesn't exist/);
  }
});

test('exports currency types', () => {
  expect(Maker.ETH(1).toString()).toEqual('1.00 ETH');
});
