import mainnetMapping from './addresses/mainnet';
import kovanMapping from './addresses/kovan';
import testMapping from './addresses/test';

const mapping = [
  { name: 'mainnet', networkId: 1, addresses: mainnetMapping },
  { name: 'morden', networkId: 2, addresses: null },
  { name: 'ropsten', networkId: 3, addresses: null },
  { name: 'rinkeby', networkId: 4, addresses: null },
  { name: 'kovan', networkId: 42, addresses: kovanMapping },
  { name: 'test', networkId: 999, addresses: testMapping }
];

export default mapping;
