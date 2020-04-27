import Maker, { ETH, LocalService } from '../src/index';
import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';
const Maker2 = require('../src/index');

async function createMaker(privateKey) {
  return await Maker.create('test', { privateKey, log: false });
}

test('create without any options', async () => {
  await Maker.create('test');
});

test('import vs require', () => {
  expect(Maker2).toEqual(Maker);
  expect(Maker2.ETH).toEqual(ETH);
  expect(Maker2.LocalService).toEqual(LocalService);
});

// test('openCdp', async () => {
//   const maker = await createMaker();
//   const cdp = await maker.openCdp();
//   const id = cdp.id;
//   expect(typeof id).toBe('number');
//   expect(id).toBeGreaterThan(0);
// });

// test('openCdp with a private key', async () => {
//   const testAccount = TestAccountProvider.nextAccount();
//
//   const maker = await createMaker(testAccount.key);
//   const cdp = await maker.openCdp();
//   const id = cdp.id;
//   expect(typeof id).toBe('number');
//   expect(id).toBeGreaterThan(0);
//   const info = await cdp.getInfo();
//   expect(info.lad.toLowerCase()).toEqual(testAccount.address);
// }, 5000);

// test('creates a new CDP object for existing CDPs', async () => {
//   const maker = await createMaker();
//   const cdp = await maker.openCdp();
//   const id = cdp.id;
//   const newCdp = await maker.getCdp(id);
//   expect(id).toEqual(newCdp.id);
//   expect(cdp._cdpService).toEqual(newCdp._cdpService);
//   expect(cdp._smartContractService).toEqual(newCdp._smartContractService);
// });

// test('throws an error for an invalid id', async () => {
//   const maker = await createMaker();
//   expect.assertions(1);
//   try {
//     await maker.getCdp(99999);
//   } catch (err) {
//     expect(err.message).toMatch(/CDP doesn't exist/);
//   }
// });

test('exports currency types', () => {
  expect(Maker.ETH(1).toString()).toEqual('1.00 ETH');
});

test('injected provider is called', async () => {
  expect.assertions(3);
  const mockSend = jest.fn((payload, callback) => callback(payload));
  const mockProvider = { sendAsync: mockSend, send: mockSend };
  const maker = await Maker.create('inject', {
    provider: { inject: mockProvider },
    autoAuthenticate: false
  });
  expect(mockSend).not.toBeCalled();

  try {
    await maker.authenticate();
  } catch (e) {
    expect(e.method).toBe('eth_accounts');
  }

  expect(mockSend).toBeCalled();
});

test('smartContract.addressOverrides can override plugins', async () => {
  const maker = await Maker.create('test', {
    plugins: [
      {
        addConfig: () => ({
          smartContract: {
            addContracts: {
              FOO: { address: '0xfoo', abi: [] }
            }
          }
        })
      }
    ],
    smartContract: {
      addressOverrides: { FOO: '0xfoo2' }
    },
    log: false
  });

  // addressOverrides should be able to modify contracts added by plugins
  const addresses = maker.service('smartContract').getContractAddresses();
  expect(addresses.FOO).toEqual('0xfoo2');
});
