# Dai.js SDK monorepo

Uses [Lerna](https://github.com/lerna/lerna). Automatically lints and prettifies
code on commit.

## Getting started

```
yarn
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
