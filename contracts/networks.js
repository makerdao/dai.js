import mainnetMapping from './addresses/mainnet';
import kovanMapping from './addresses/kovan';
import testMapping from './addresses/test';

const mapping = [
  { name: 'main', networkID: 1, addresses: mainnetMapping },
  { name: 'kovan', networkID: 42, addresses: kovanMapping },
  { name: 'test', networkID: 999, addresses: testMapping }
];

export default mapping;
