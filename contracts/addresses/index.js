import daiV1 from './daiV1.json';
import exchanges from './exchanges.json';

// these addresses can be dynamically changed at build-time
import testnetAddressesDaiV1 from '../abi/dai/v1/addresses.json';

// eventually, the testnet exchange address(es) could also be changed at build-time
// for now though, we import hardcoded value(s) from the exchanges.json file
const testnet = {
  ...testnetAddressesDaiV1,
  ...exchanges.testnet
};

const kovan = {
  ...daiV1.kovan,
  ...exchanges.kovan
};

const mainnet = {
  ...daiV1.mainnet,
  ...exchanges.mainnet
};

export { testnet, kovan, mainnet };
