# Webpack ES6 boilerplate

[![tests][tests]][tests-url]
[![coverage][cover]][cover-url]

A minimalistic Webpack 2 ES6 boilerplate project.

## Prerequisites

[![node][node]][node-url]
[![npm][npm]][npm-url]
      
- [Node.js](http://es6-features.org)

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

## Start Dev Server

1. `git clone https://github.com/jluccisano/webpack-es6-boilerplate.git`
2. Run `npm install`
3. Start the dev server using `npm start`
3. Open [http://localhost:9000](http://localhost:9000)


## Commands

- `npm start` - start the dev server
- `npm run build` - create build in `dist` folder
- `npm run lint` - run an ESLint check
- `npm run coverage` - run code coverage and generate report in the `coverage` folder
- `npm test` - run all tests
- `npm run test:watch` - run all tests in watch mode

## Licence

_webpack-es6-boilerplate_ is available under MIT.

[npm]: https://img.shields.io/badge/npm-5.3.0-blue.svg
[npm-url]: https://npmjs.com/

[node]: https://img.shields.io/node/v/webpack-es6-boilerplate.svg
[node-url]: https://nodejs.org

[tests]: http://img.shields.io/travis/jluccisano/webpack-es6-boilerplate.svg
[tests-url]: https://travis-ci.org/jluccisano/webpack-es6-boilerplate

[cover]: https://codecov.io/gh/jluccisano/webpack-es6-boilerplate/branch/master/graph/badge.svg
[cover-url]: https://codecov.io/gh/jluccisano/webpack-es6-boilerplate