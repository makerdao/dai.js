# Dai.js SDK monorepo

Uses [Lerna](https://github.com/lerna/lerna). Automatically lints and prettifies
code on commit.

## Getting started

```
yarn
yarn lerna bootstrap // Installs dependencies & links all local dependencies together
cd packages/dai
yarn build:backend // Builds the dai package for use in the other plugins
cd ../services-core
yarn build // Builds the services-core package for use in the other plugins
cd ../dai-plugin-mcd
yarn build // Builds the MCD package for use in other plugins
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

### Test coverage

```
yarn coverage
```
