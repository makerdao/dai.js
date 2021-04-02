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

test('get unsafe LINK-A vaults', async () => {
  const urns = await service.getUnsafeVaults('LINK-A');
  console.log('urns', urns);
}, 10000);

test('get all LINK-A clips', async () => {
  const clips = await service.getAllClips('LINK-A');
  console.log('clips', clips);
}, 10000);
