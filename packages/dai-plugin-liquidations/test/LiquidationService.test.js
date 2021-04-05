// import Maker from '@makerdao/dai';
// import McdPlugin from '@makerdao/dai-plugin-mcd';
import Maker from '../../dai/src';
import { McdPlugin, ETH, DAI, LINK } from '../../dai-plugin-mcd/src';
import liquidationPlugin from '../src';
import LiquidationService from '../src/LiquidationService';
import { createVaults, createAuctions } from '../test/utils';

// const infuraProjectId = 'c3f0f26a4c1742e0949d8eedfc47be67';

let service, network, maker;

async function makerInstance(preset) {
  const maker = await Maker.create(preset, {
    plugins: [[liquidationPlugin], [McdPlugin, { network: 'testchain' }]],
    web3: {
      pollingInterval: 100
      // provider: {
      //   infuraProjectId
      // }
    }
  });
  await maker.authenticate();
  return maker;
}

beforeAll(async () => {
  // await createAuctions();
  network = 'test';
  maker = await makerInstance(network);
  service = maker.service('liquidation');
}, 60000);

test.only('can create liquidation service', async () => {
  await createVaults(maker);
  await createAuctions(maker);
  expect(service).toBeInstanceOf(LiquidationService);
}, 30000);

test('get unsafe vaults', async () => {
  const urns = await service.getUnsafeVaults('LINK-A');
  console.log('urns', urns);
}, 10000);
