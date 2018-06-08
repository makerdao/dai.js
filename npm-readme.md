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


## How to Install

Use NPM to install the library:
```
npm install @makerdao/makerdao-exchange-integration
```

You can then include it using either the CommonJS or the UMD standard.

CommonJS:
```
import Maker from '@makerdao/makerdao-exchange-integration';
```

UMD:
```
<script src="./maker-exchange-integration.js"/>
```


## How to Use

Once imported, you can use these objects to create a new instance of the Maker class and to access Maker functionality.

For full documentation, please reference https://makerdao.com/documentation/

Example:
```
import Maker from '@makerdao/makerdao-exchange-integration';
const maker = new Maker('test');
const cdp = await maker.openCdp();
const info = await cdp.getInfo();
console.log(info);
```

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
