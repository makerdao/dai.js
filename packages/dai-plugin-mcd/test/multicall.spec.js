import { createWatcher } from '@makerdao/multicall';
import { mcdMaker } from './helpers';
import { ServiceRoles } from '../src/constants';
import { ETH, USD } from '@makerdao/dai';

describe('CdpType integration', () => {
  let watcher, maker, scs;

  beforeAll(async () => {
    maker = await mcdMaker({
      prefetch: false,
      web3: { pollingInterval: 20 }
    });

    scs = maker.service('smartContract');
    watcher = createWatcher([], {
      rpcUrl: maker.service('web3').rpcUrl,
      multicallAddress: scs.getContractAddress('MULTICALL'),
      config: { interval: 50 }
    });
  });

  test('populate CdpType cache', async () => {
    const cts = maker.service(ServiceRoles.CDP_TYPE);
    const ethA = cts.getCdpType(null, 'ETH-A');
    expect(ethA.cache).toEqual({});

    cts.useMulticall(watcher);
    watcher.start();
    await watcher.awaitInitialFetch();

    // TODO don't hardcode all these values
    expect(ethA.cache).toEqual({
      adapterBalance: '0',
      par: '1000000000000000000000000000',
      jugInfo: {
        duty: '1000000001547125957863212448',
        rho: '1563241233'
      },
      vatInfo: {
        Art: '0',
        rate: '1000000000000000000000000000',
        spot: '100000000000000000000000000000',
        line: '100000000000000000000000000000000000000000000000000'
      },
      spotInfo: {
        pip: expect.any(String),
        mat: '1500000000000000000000000000'
      },
      catInfo: {
        flip: expect.any(String),
        chop: '1050000000000000000000000000',
        lump: '1500000000000000000'
      }
    });

    // testing these separately because they're EIP55 checksum addresses
    expect(ethA.cache.spotInfo.pip.toLowerCase()).toEqual(
      scs.getContractAddress('PIP_ETH')
    );
    expect(ethA.cache.catInfo.flip.toLowerCase()).toEqual(
      scs.getContractAddress('MCD_FLIP_ETH_A')
    );

    const expectedPrice = USD(150).div(ETH(1));
    expect(ethA.price.eq(expectedPrice)).toBeTruthy();

    const repA = cts.getCdpType(null, 'REP-A');
    expect(repA.cache).toEqual({
      adapterBalance: '0',
      catInfo: {
        chop: '1080000000000000000000000000',
        flip: expect.any(String),
        lump: '1500000000000000000000'
      },
      jugInfo: {
        duty: '1000000003022265980097387650',
        rho: '1563241298'
      },
      par: '1000000000000000000000000000',
      spotInfo: {
        mat: '1800000000000000000000000000',
        pip: expect.any(String)
      },
      vatInfo: {
        Art: '0',
        line: '5000000000000000000000000000000000000000000000000',
        rate: '1000000000000000000000000000',
        spot: '11111111111111111111111111111'
      }
    });

    // testing these separately because they're EIP55 checksum addresses
    expect(repA.cache.spotInfo.pip.toLowerCase()).toEqual(
      scs.getContractAddress('PIP_REP')
    );
    expect(repA.cache.catInfo.flip.toLowerCase()).toEqual(
      scs.getContractAddress('MCD_FLIP_REP_A')
    );

  });
});
