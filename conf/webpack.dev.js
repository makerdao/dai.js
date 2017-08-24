const webpack = require('webpack');
const Merge = require('webpack-merge');
const CommonConfig = require('./webpack.common.js');

module.exports = Merge(CommonConfig, {
  plugins: [
      new webpack.HotModuleReplacementPlugin()
  ],
  devServer: {
    publicPath: '/',
    port: 9000,
    contentBase: 'dist/',
    host: 'localhost',
    historyApiFallback: true,
    noInfo: false,
    stats: 'minimal',
    hot: true
  }
});