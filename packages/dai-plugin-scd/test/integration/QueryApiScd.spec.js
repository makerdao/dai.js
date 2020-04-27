import { mcdMaker } from '../helpers';
import { ServiceRoles } from '../../src/constants';
import { infuraProjectId } from './index';

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

test('getPriceHistoryForPip for ETH', async () => {
  const prices = await service.getPriceHistoryForPip(
    '0x75dd74e8afe8110c8320ed397cccff3b8134d981'
  );
  expect(!!prices[0].val && !!prices[0].blockNumber).toBe(true);
});

function expectFrobEvents(events) {
  const event = events[0];
  expect(
    !!event.dart &&
      !!event.dink &&
      !!event.ilkRate &&
      !!event.tx.transactionHash &&
      !!event.tx.txFrom &&
      !!event.tx.era.iso &&
      !!event.ilkIdentifier
  ).toBe(true);
  expect(new Date(events[0].tx.era.iso) > new Date(events[1].tx.era.iso)).toBe(
    true
  );
}

//these are ilks  and urns that correspond to frobEvets in the current vdb data generator and remote kovan vdb instance
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
      urn: '0xAE21412A422279B72aA8641a3D5F1da4BF6cfD30',
      ilk: 'ETH-A'
    },
    {
      urn: '0xB8de18329DAcA5c712a341596a66483366E3E3F6',
      ilk: 'ETH-A'
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
