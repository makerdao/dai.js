import { mainnetMapping, kovanMapping, testnetMapping } from './mappings';

const mapping = [
  { name: 'mainnet', networkId: 1, addresses: mainnetMapping },
  { name: 'morden', networkId: 2, addresses: null },
  { name: 'ropsten', networkId: 3, addresses: null },
  { name: 'rinkeby', networkId: 4, addresses: null },
  { name: 'kovan', networkId: 42, addresses: kovanMapping },
  { name: 'test', networkId: 999, addresses: testnetMapping }
];

export default mapping;
