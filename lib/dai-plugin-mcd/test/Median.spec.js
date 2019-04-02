import Maker from '@makerdao/dai';
import McdPlugin, { USD_ETH } from '../src';
import addresses from '../contracts/addresses/testnet.json';
import MedianAbi from '../contracts/abis/Median.json';
import { ServiceRoles } from '../src/constants';

let maker;

beforeAll(async () => {
  maker = await Maker.create('test', {
    log: false,
    plugins: [McdPlugin],
    smartContract: {
      addContracts: {
        PIP_ETH: {
          address: addresses.PIP_ETH_MEDIAN,
          abi: MedianAbi
        }
      }
    }
  });
});

test('read price from Median', async () => {
  const cdpType = maker
    .service(ServiceRoles.CDP_TYPE)
    .getCdpType(null, 'ETH-A');

  expect(cdpType._pipAddress).toEqual(addresses.PIP_ETH_MEDIAN);
  const price = await cdpType.getPrice();
  expect(price).toEqual(USD_ETH(0));
});
