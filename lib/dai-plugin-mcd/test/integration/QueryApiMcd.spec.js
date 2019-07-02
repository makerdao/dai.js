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
      !!event.ilk.rate &&
      !!event.tx.transactionHash &&
      !!event.tx.txFrom &&
      !!event.tx.era.iso &&
      !!event.urn.nodes[0].art &&
      !!event.urn.nodes[0].ink &&
      !!event.ilkIdentifier
  ).toBe(true);
  expect(new Date(events[0].tx.era.iso) > new Date(events[1].tx.era.iso)).toBe(
    true
  );
}

//these are ilks  and urns that correspond to frobEvets in the current vdb data generator and remove kovan vdb instance
const frobParams = {
  test: [
    {
      urn: '0xd6a62aadf5a1593078b55a30c1067ff0e4d24369',
      ilk: 'BEF5872'
    },
    {
      urn: '0xbe72af4323df8b82949d45857ea7c5d7f0cc9246',
      ilk: 'D06C8A8'
    }
  ],
  kovan: [
    {
      urn: '0xE034c5D04892F95F738AEc00B80C2679B304fC22',
      ilk: 'REP-A'
    },
    {
      urn: '0x4E95F961BafFe16cF222D329cE5D9dc45aD9086d',
      ilk: 'REP-A'
    }
  ]
};

test('getCdpEventsForIlkAndUrn', async () => {
  const events = await service.getCdpEventsForIlkAndUrn(
    frobParams[process.env.NETWORK][0].ilk,
    frobParams[process.env.NETWORK][0].urn
  );
  expectFrobEvents(events);
});

test('getCdpEventsForArrayOfIlksAndUrns', async () => {
  const events = await service.getCdpEventsForArrayOfIlksAndUrns(
    frobParams[process.env.NETWORK]
  );
  expectFrobEvents(events);
});
