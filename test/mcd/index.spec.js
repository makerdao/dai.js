// import addresses from './addresses.json';
// import abiMap from './abiMap.json';
// import { mapValues } from 'lodash';
// import Maker from '../../src';
//
// const mcdContracts = mapValues(addresses, (address, name) => ({
//   address,
//   abi: require(`./abi/${abiMap[name]}.json`)
// }));

test.skip('mcd contract availability', async () => {
  const maker = Maker.create('test', {
    smartContract: { addContracts: mcdContracts },
    log: false
  });

  await maker.authenticate();

  const address = maker
    .service('smartContract')
    .getContractAddressByName('PIP_DGX');
  expect(address).toEqual('0x174666d4101f6294eba19d0846ec85176d28f2e6');
});
