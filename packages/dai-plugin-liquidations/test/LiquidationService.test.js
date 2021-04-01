import Maker from '@makerdao/dai';
import liquidationPlugin from '../src';
import LiquidationService from '../src/LiquidationService';

import createAuctions from '../src/create-auctions';

// const infuraProjectId = 'c3f0f26a4c1742e0949d8eedfc47be67';

let service, network;

async function makerInstance(preset) {
  const maker = await Maker.create(preset, {
    plugins: [[liquidationPlugin]],
    web3: {
      pollingInterval: 100
      // provider: {
      //   infuraProjectId
      // }
    }
  });
  return maker;
}

beforeAll(async () => {
  await createAuctions();
  network = 'testnet';
  const maker = await makerInstance(network);
  service = maker.service('liquidation');
}, 60000);

test('can create liquidation service', async () => {
  expect(service).toBeInstanceOf(LiquidationService);
});

test('get unsafe vaults', async () => {
  const urns = await service.getUnsafeVaults('LINK-A');
  console.log('urns', urns);
}, 10000);
