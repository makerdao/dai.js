import Maker from '../../src/index';

let maker, cdp, id;

beforeAll(async () => {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('Please set a private key to run integration tests.');
  }

  maker = Maker.create(process.env.NETWORK, {
    privateKey: process.env.PRIVATE_KEY
  });

  await maker.authenticate();
  cdp = await maker.openCdp();
});

test('can create Maker instance', () => {
  expect(maker).toBeDefined();
});

test(
  'can open a CDP',
  async () => {
    id = await cdp.getId();
    expect(cdp).toBeDefined();
    expect(typeof id).toEqual('number');
  },
  100000
);

test(
  'can shut a CDP',
  async () => {
    await cdp.shut();
    const info = await cdp.getInfo();
    expect(info.lad).toBe('0x0000000000000000000000000000000000000000');
  },
  100000
);
