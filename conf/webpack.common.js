const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
  //context: path.join(process.cwd(), 'web'), //the home directory for webpack
  output: {
    path: path.join(process.cwd(), 'dist'),
    filename: '[name].[hash].js',
    sourceMapFilename: '[name].map',
    library: '@makerdao/makerdao-exchange-integration',
    libraryTarget: 'umd',
  },
  resolve: {
    extensions: ['.js', '.json'],
  },
  module: {
    noParse: [/dtrace-provider/, /safe-json-stringify/, /mv/],
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env', 'stage-2'],
            // plugins: [
            //   "syntax-async-functions",
            //   "transform-regenerator"
            // ]
          },
        },
      },
      {
        test: /\.json$/,
        loader: 'json-loader',
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(['dist'], { root: process.cwd() }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
    })
  ],
};
