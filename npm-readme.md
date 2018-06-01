# MakerDAO Exchange Integration

[![tests][tests]][tests-url]
[![coverage][cover]][cover-url]

A toolkit for easy integration of MakerDAO smart contract functionality with 
external platforms. 

If you're a cryptocurrency exchange looking to add leveraged ETH positions through 
distributed DAI lending to your platform, you're in the right place. 

This library aims to support a wide range of platform architectures; from fully 
decentralized with immediate on-chain settlement, to centralized exchange architectures 
with internal settlement services.

## Prerequisites

[![node][node]][node-url]
[![npm][npm]][npm-url]
      
- [Node.js](http://es6-features.org)

## How to Install

Use NPM to install the library (`npm install @makerdao/makerdao-exchange-integration`).

You can then include it using either the CommonJS or UMD standards.

CommonJS:
```
import { ConfigFactory, Maker } from '@makerdao/makerdao-exchange-integration';
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
import { Maker, ConfigFactory } from '@makerdao/makerdao-exchange-integration';


const config = ConfigFactory.create('decentralized-oasis-without-proxies');
const maker = new Maker(config);


const cdp = await maker.openCdp();
const info = await cdp.getInfo();


console.log(info);
```

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

*makerdao-exchange-integration* is availble under the MIT license included with the code.