<h1 align="center">
Dai Governance Plugin
</h1>

[![GitHub License][license]][license-url]
[![NPM][npm]][npm-url]
[![Build Status][build]][build-url]

A [dai.js](https://github.com/makerdao/dai.js) plugin for interacting with the MKR governance system. This plugin makes it easy to integrate dai governance into frontend applications such as the [maker governace dashboard](https://vote.makerdao.com/). You can use it to vote, cast proposals, query the voting contract, create a vote proxy, and much more.

## Installation

The Dai Governance Plugin requires **dai.js 0.9.2 or later.**

```
$ npm install --save @makerdao/dai-plugin-governance
```

or

```
$ yarn add @makerdao/dai-plugin-governance
```

## Examples

We will have several examples once the api is more stable. Here is one to give you some sense of how this plugin can be used:

```js
import governancePlugin from '@makerdao/dai-plugin-governance';
import Maker from '@makerdao/dai';

(async () => {
  const maker = Maker.create('browser', {
    plugins: [governancePlugin]
  });
  await maker.authenticate();
  await maker.service('chief').lock(10);
})();
```

This example will initiate a MetaMask transaction to lock 10 MKR into the maker voting system.

### Development

## Getting started

_Note: this project utilizes the [yarn](https://yarnpkg.com/en/) package manager_

Clone this repo & fetch submodules

```
$ git clone --recurse-submodules -j8 https://github.com/makerdao/dai-plugin-governance.git
```

Install project dependencies

```
$ yarn
$ yarn install --cwd "gov-testchain"
```

## Running Tests

1.  Install [dapptools](https://dapp.tools/)
1.  `yarn testnet --ci yarn test`

## Publishing

Publish to NPM

```
$ yarn deploy
```

## Code Style

We run Prettier on-commit, which means you can write code in whatever style you want and it will be automatically formatted according to the common style when you run `git commit`.

### License

The dai governance plugin is [MIT licensed](./LICENSE).

[npm]: https://img.shields.io/npm/v/@makerdao/dai-plugin-governance.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@makerdao/dai-plugin-governance
[license]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: https://github.com/makerdao/dai-plugin-governance/blob/master/LICENSE
[build]: https://travis-ci.com/makerdao/dai-plugin-governance.svg?token=7qKLu97qQDDMKfaxt318&branch=master
[build-url]: https://travis-ci.com/makerdao/dai-plugin-governance
