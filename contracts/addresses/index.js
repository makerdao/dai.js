import daiV1 from './daiV1.json';
import exchanges from './exchanges.json';
import proxies from './proxies.json';

// these addresses can be dynamically changed at build-time
import testnetAddressesDaiV1 from '../abi/dai/v1/addresses.json';
import testnetAddressesProxies from '../abi/dsProxy/addresses.json';

// eventually, the testnet exchange address(es) could also be changed at build-time
// for now though, we import hardcoded value(s) from the exchanges.json file
const testnet = {
  ...testnetAddressesDaiV1,
  ...testnetAddressesProxies,
  ...exchanges.testnet,
  ...proxies.testnet
};

const kovan = {
  ...daiV1.kovan,
  ...exchanges.kovan,
  ...proxies.kovan
};

const mainnet = {
  ...daiV1.mainnet,
  ...exchanges.mainnet,
  ...proxies.mainnet
};

export { testnet, kovan, mainnet };
