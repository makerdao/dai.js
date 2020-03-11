# Dai.js

[![GitHub License][license]][license-url]
[![NPM][npm]][npm-url]
[![Build Status][build]][build-url]
[![Coverage Status][cover]][cover-url]


**Dai.js** is a JavaScript library that makes it easy to build applications on top of [MakerDAO][makerdao]'s Dai Stablecoin System. You can use Maker's contracts to open Collateralized Debt Positions, withdraw loans in Dai, trade tokens on OasisDEX, and more.

The library features a pluggable, service-based architecture, which allows users maximal control when integrating the Maker functionality into existing infrastructures. It also includes convenient configuration presets for out-of-the-box usability, a powerful smart contract state inspector, and support for both front-end and back-end applications.

Maker's entire suite of contracts will eventually be accessible through this library—including the DAO governance and the upcoming multi-collateral release—but functionality is limited in the current alpha version to the following areas:

* Opening and shutting CDPs
* Locking and unlocking collateral
* Withdrawing and repaying Dai
* Automated token conversions
* Token contract functionality for WETH, PETH, MKR, Dai, and ETH
* Buying and selling MKR and Dai with built-in DEX integration

## Usage

Use NPM or Yarn to install the library:
```
npm install @makerdao/dai
```

Then include it:

```js
import Maker from '@makerdao/dai';
// or:
const Maker = require('@makerdao/dai');
```

Example for transferring Dai:
```js
import Maker from '@makerdao/dai';
const maker = Maker.create('test');
await maker.authenticate();

transferDai(address, amount) {
  const dai = maker.service('token').getToken('DAI');
  return dai.transfer(address, amount);
 }
```

Example for using CDPs:
```js
import Maker from '@makerdao/dai';
const maker = Maker.create('test');
await maker.authenticate();
const cdp = await maker.openCdp();
const info = await cdp.getInfo();
console.log(info);
```

For full documentation, please refer to [docs.makerdao.com](https://docs.makerdao.com/dai.js).

For example code that consumes the library, check out [this repository](https://github.com/makerdao/integration-examples).

## Developing

1. `git clone https://github.com/makerdao/dai.js`
2. `yarn install`
3. Install testchain - `git submodule update --init --recursive`
4. Install [dapptools](https://dapp.tools/) - `curl https://dapp.tools/install | sh`

### Running the unit tests

The test suite is configured to run on a Ganache test chain. Before running the tests with `yarn test`, the test chain will start from a snapshot that has the Maker contracts deployed to it.

If you want to re-run the tests whenever you make a change to the code, use `yarn test:watch`.

If you want to start a test chain and leave it running, use `yarn test:net`.

### Running the integration tests

There are also automated tests that send transactions through either the Kovan test network or the Ethereum main network. To use them, first set your private key for the appropriate network to an environment variable:

`export PRIVATE_KEY="0x..."`

Then, use either `yarn test:kovan` or `yarn test:mainnet` to run the tests.

Since these networks run much more slowly than Ganache, you might want to set the debug environment variable (in order to see some relevant output along the way):

`export DEBUG="dai:testing"`

You can also run these tests on the local test network with the command `yarn test:integration`.

### Handling changes to contract code

If you have deployed contract code changes to the testchain, run `scripts/install-testchain-outputs.sh` to copy any updated ABI files and contract addresses to their expected locations.

### Commands

- `yarn build:backend` - create backend build in `dist` folder
- `yarn build:frontend` - create a UMD build in `dist` folder
- `yarn lint` - run an ESLint check
- `yarn coverage` - run code coverage and generate report in the `coverage` folder
- `yarn test` - start a test chain and run all tests
- `yarn test:watch` - start a test chain and run all tests in watch mode
- `yarn test:net` - just start a test chain
- `yarn test:kovan` - run integration tests on Kovan
- `yarn test:mainnet` - run integration tests on mainnet
- `yarn test:integration` - run integration tests on Ganache

## Changelog

### 0.17.0

- **BREAKING CHANGE**: Importing a file directly from the package must now be done by
prefixing the path with `dist`. E.g. `/contracts/addresses/kovan.json` now becomes
`/dist/contract/addresses/kovan.json`.

## License

**Dai.js** is available under the MIT license included with the code.

[npm]: https://img.shields.io/npm/v/@makerdao/dai.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@makerdao/dai

[tests]: http://img.shields.io/travis/makerdao/dai.js.svg
[tests-url]: https://travis-ci.org/makerdao/dai.js

[license]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: https://github.com/makerdao/dai.js/blob/dev/LICENSE

[build]: https://travis-ci.com/makerdao/dai.js.svg?branch=dev
[build-url]: https://travis-ci.com/makerdao/dai.js

[cover]: https://codecov.io/gh/makerdao/dai.js/branch/dev/graph/badge.svg
[cover-url]: https://codecov.io/github/makerdao/dai.js?branch=dev

[makerdao]: https://makerdao.com
[wiki]: https://github.com/makerdao/dai.js/wiki
