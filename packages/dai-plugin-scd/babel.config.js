module.exports = function(api) {
  api.cache(true);

  const presets = ['@babel/preset-env'];
  const plugins = [
    '@babel/plugin-proposal-optional-chaining',
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    '@babel/plugin-proposal-function-sent',
    '@babel/plugin-proposal-export-namespace-from',
    '@babel/plugin-proposal-numeric-separator',
    '@babel/plugin-proposal-throw-expressions',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-transform-runtime'
  ];

  const babelrcRoots = ['.', './lib/*'];

  return {
    presets,
    plugins,
    babelrcRoots
  };
};
