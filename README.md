# Dai.js

[![node][node]][node-url]
[![npm][npm]][npm-url]
<!-- these will work once the repo is public
[![tests][tests]][tests-url]
[![coverage][cover]][cover-url]
-->

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

Use NPM to install the library:
```
npm install @makerdao/dai
```

Then include it:

```
import Maker from '@makerdao/dai';
// or:
const Maker = require('@makerdao/dai');
```

Example:
```
import Maker from '@makerdao/dai';
const maker = Maker.create('test');
const cdp = await maker.openCdp();
const info = await cdp.getInfo();
console.log(info);
```

For full documentation, please refer to [https://makerdao.com/documentation/][docs].

For example code that consumes the library, check out [this repository](https://github.com/makerdao/integration-examples).

## Developing

1. `git clone https://github.com/makerdao/dai.js`
2. `npm install`

### Running the tests

The test suite is configured to run on a Ganache test chain. Before running the tests (`npm test`), the test chain will start, and the script will deploy all the Maker contracts to the chain.

To avoid waiting for this process every time you run the tests, use the command `npm run test:watch`.

If you want to deploy the contracts to a test chain independently from the test suite, use `npm run test:net`.

### Commands

- `npm run build:backend` - create backend build in `dist` folder
- `npm run build:frontend` - create a UMD build in `dist` folder
- `npm run lint` - run an ESLint check
- `npm run coverage` - run code coverage and generate report in the `coverage` folder
- `npm test` - start a test chain and run all tests
- `npm run test:watch` - start a test chain and run all tests in watch mode
- `npm run test:net` - just start a test chain

## License

**Dai.js** is available under the MIT license included with the code.

[npm]: https://img.shields.io/badge/npm-5.6.0-blue.svg
[npm-url]: https://npmjs.com/

[node]: https://img.shields.io/node/v/latest.svg
[node-url]: https://nodejs.org

[tests]: http://img.shields.io/travis/makerdao/dai.js.svg
[tests-url]: https://travis-ci.org/makerdao/dai.js

[cover]: https://codecov.io/gh/makerdao/dai.js/branch/master/graph/badge.svg
[cover-url]: https://codecov.io/gh/makerdao/dai.js

[makerdao]: https://makerdao.com
[docs]: https://makerdao.com/documentation
