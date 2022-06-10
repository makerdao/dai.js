# DEPRECATED

Active maintenance of this library has been discontinued. Please visit [https://chat.makerdao.com](https://chat.makerdao.com) for support.

[![No Maintenance Intended](https://unmaintained.tech/badge.svg)](https://unmaintained.tech/)

# Dai.js SDK monorepo

[![Build Status][build]][build-url]
[![Coverage Status][cover]][cover-url]

Uses [Lerna](https://github.com/lerna/lerna). Automatically lints and prettifies
code on commit.

## Documentation

Please view `README.md` for each individual package (e.g. [packages/dai](https://github.com/makerdao/dai.js/blob/dev/packages/dai/README.md)) and/or [docs.makerdao.com](https://docs.makerdao.com/dai.js).

## Getting started

```
yarn
curl https://dapp.tools/install | sh // Installs dapptools
yarn lerna bootstrap // Installs dependencies & links all local dependencies together
yarn build // builds each plugin for local use
```

### Running the testchain

```
yarn testchain
yarn test:logs // get testchain logs
```

### Running tests

```
yarn test
yarn test:integration
yarn test:build
```

Run `yarn coverage` to generate a test coverage report.

### Creating a UMD build

See [packages/dai/README.md](https://github.com/makerdao/dai.js/blob/dev/packages/dai/README.md#commands) for instructions.


## Adding a package as dependency of another

```
 npx lerna add @makerdao/services-core packages/dai-plugin-mcd
```

## Releasing a version

From the root of the project:

```
npx lerna version prerelease
npx lerna publish from-package
```

This will create a new version for all the packages and publish automatically, prerelease is for alpha versions.

If you want a release or another kind please check [lerna version](https://github.com/lerna/lerna/tree/main/commands/version) documentation.



[build]: https://circleci.com/gh/makerdao/dai.js.svg?style=svg
[build-url]: https://circleci.com/gh/makerdao/dai.js
[cover]: https://codecov.io/gh/makerdao/dai.js/branch/dev/graph/badge.svg
[cover-url]: https://codecov.io/gh/makerdao/dai.js

