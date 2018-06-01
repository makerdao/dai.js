# MakerDAO Exchange Integration

[![tests][tests]][tests-url]
[![coverage][cover]][cover-url]

**MakerDAO Exchange Integration** is a JavaScript library that makes it easy to build applications on top of MakerDAO's platform of smart contracts. You can use Maker's contracts to open Collateralized Debt Positions, withdraw loans in Dai, trade tokens on OasisDEX, and more.

The library features a pluggable, service-based architecture, which allows users maximal control when integrating the Maker functionality into existing infrastructures. It also includes convenient configuration presets for out-of-the-box usability, a powerful smart contract state inspector, and support for both front-end and back-end applications.

Maker's entire suite of contracts will eventually be accessible through this library—including the DAO governance and the upcoming multi-collateral release—but functionality is limited in the current alpha version to the following areas:

* Opening and shutting CDPs
* Locking and unlocking collateral
* Withdrawing and repaying Dai
* Automated token conversions
* Token contract functionality for WETH, PETH, MKR, Dai, and ETH
* Buying and selling MKR and Dai with built-in DEX integration


## Prerequisites

[![node][node]][node-url]
[![npm][npm]][npm-url]
      
- [Node.js](http://es6-features.org)


## Setup

1. `git clone https://github.com/makerdao/makerdao-integration-poc`
2. Run `npm install`
3. Start the dev server using `npm start`
3. Open [http://localhost:9000](http://localhost:9000)


## Run the tests

The test suite is configured to run on a Ganache test chain. Before running the tests (`npm run test`), the test chain will start, and the script will deploy all the Maker contracts to the chain.

To avoid waiting for this process every time you run the tests, use the command `npm run test:watch`.

If you want to deploy the contracts to a test chain independently from the test suite, use `npm run test:net`.


## Documentation

For the full library documentation, please reference https://makerdao.com/documentation/


## Commands

- `npm start` - start the dev server
- `npm run build:backend` - create backend build in `dist` folder
- `npm run build:frontend` - create frontend build in `dist` folder
- `npm run lint` - run an ESLint check
- `npm run coverage` - run code coverage and generate report in the `coverage` folder
- `npm test` - run all tests
- `npm run test:watch` - run all tests in watch mode
- `npm run test:net` - launch a Ganache test chain and deploy MakerDAO's contracts on it


## Features

- [Webpack](https://webpack.js.org/guides) (v3.5.5)
    - [Webpack Dev Server](https://github.com/webpack/webpack-dev-server) (v2.7.1)
    - [Hot Module Replacement](https://webpack.js.org/concepts/hot-module-replacement)
    - [Clean Webpack Plugin](https://github.com/johnagan/clean-webpack-plugin) (v0.1.16)
- [ECMAScript 6](http://es6-features.org)
- [Babel](https://babeljs.io/docs/setup/#installation) (v6.26.0)
- [ESLint](https://eslint.org/docs/user-guide/getting-started) (v4.5.0)
- [Jest](https://facebook.github.io/jest/docs/en/getting-started.html) (v20.0.4)
- [Sass](http://sass-lang.com/guide)


## License

**MakerDAO Exchange Integration** is available under the MIT license included with the code.


[npm]: https://img.shields.io/badge/npm-5.3.0-blue.svg
[npm-url]: https://npmjs.com/

[node]: https://img.shields.io/node/v/webpack-es6-boilerplate.svg
[node-url]: https://nodejs.org

[tests]: http://img.shields.io/travis/jluccisano/webpack-es6-boilerplate.svg
[tests-url]: https://travis-ci.org/jluccisano/webpack-es6-boilerplate

[cover]: https://codecov.io/gh/jluccisano/webpack-es6-boilerplate/branch/master/graph/badge.svg
[cover-url]: https://codecov.io/gh/jluccisano/webpack-es6-boilerplate