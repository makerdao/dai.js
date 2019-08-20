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

### Test coverage

```
yarn coverage
```
