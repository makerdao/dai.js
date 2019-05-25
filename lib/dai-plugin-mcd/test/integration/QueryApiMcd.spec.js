import { mcdMaker } from '../helpers';
import { ServiceRoles } from '../../src/constants';
import { infuraProjectId } from '../../../../test/helpers/serviceBuilders';

let service;

beforeAll(async () => {
  const settings = {
    web3: {
      provider: {
        infuraProjectId
      }
    }
  };
  const network =
  process.env.NETWORK === 'test' ? 'testnet' : process.env.NETWORK;
  const maker = await mcdMaker({
    preset: process.env.NETWORK,
    network: network,
    ...settings
  });
  service = maker.service(ServiceRoles.QUERY_API);
});

//this test currently uses the kovan server since the price data is not in the local vulcanize db yet
test('getPriceHistoryForPip for ETH', async () => {
  const prices = await service.getPriceHistoryForPip(
    '0x8C73Ec0fBCdEC6b8C060BC224D94740FD41f3774'
  );
  expect(!!prices[0].val && !!prices[0].blockNumber).toBe(true);
});

function expectFrobEvents(events) {
  const event = events[0];
  expect(
    !!event.dart &&
      !!event.dink &&
      !!event.ilk.nodes[0].rate &&
      !!event.tx.transactionHash &&
      !!event.tx.txFrom &&
      !!event.tx.era.iso &&
      !!event.urn.nodes[0].art &&
      !!event.urn.nodes[0].ink &&
      !!event.ilkName
  ).toBe(true);
  expect(new Date(events[0].tx.era.iso) > new Date(events[1].tx.era.iso)).toBe(
    true
  );
}

test('getCdpEventsForIlkAndUrn', async () => {
  const events = await service.getCdpEventsForIlkAndUrn(
    '4FE14',
    '0x8392807d646cf6300b9fcd1fbd35fb2e4b738d75'
  );
  expectFrobEvents(events);
});

test('getCdpEventsForArrayOfIlksAndUrns', async () => {
  const events = await service.getCdpEventsForArrayOfIlksAndUrns([
    {
      ilk: '4FE14',
      urn: '0x8392807d646cf6300b9fcd1fbd35fb2e4b738d75'
    },
    {
      ilk: '4FE14',
      urn: '0x98c06a86a1bc4a2689a83494a018274067572798'
    }
  ]);
  expectFrobEvents(events);
});