import Maker from '@makerdao/dai';
import liquidationPlugin from '../src';
import LiquidationService from '../src/LiquidationService';

const infuraProjectId = 'c3f0f26a4c1742e0949d8eedfc47be67';

let service, network;

async function makerInstance(preset) {
  const maker = await Maker.create(preset, {
    plugins: [[liquidationPlugin]],
    web3: {
      pollingInterval: 100,
      provider: {
        infuraProjectId
      }
    }
  });
  return maker;
}

beforeAll(async () => {
  network = 'kovan';
  const maker = await makerInstance(network);
  service = maker.service('liquidation');
});

test('can create liquidation service', async () => {
  expect(service).toBeInstanceOf(LiquidationService);
});

test('get unsafe vaults', async () => {
  await service.getUnsafeVaults();
});