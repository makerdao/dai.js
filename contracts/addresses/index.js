import daiV1 from './daiV1.json';
import exchanges from './exchanges.json';

const testnet = {
    ...daiV1.testnet,
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
