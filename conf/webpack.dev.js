const webpack = require('webpack');
const path = require('path');
const Merge = require('webpack-merge');
const CommonConfig = require('./webpack.common.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const extractSass = new ExtractTextPlugin({
  filename: '[name].[contenthash].css',
});

const VueLoaderPlugin = require('vue-loader/lib/plugin');

module.exports = Merge(CommonConfig, {
  entry: {
    app: ['babel-polyfill', './src/index.js'],
    web: ['babel-polyfill', './web/index.js']
  },
  devtool: 'inline-source-map', // enhance debugging by adding meta info for the browser devtools
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.css/,
        use: [
          'vue-style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.scss$/,
        use: [
          'vue-style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
            },
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
            },
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      title: 'Maker.js demo'
    }),
    new VueLoaderPlugin(),
    extractSass
  ],
  devServer: {
    host: '0.0.0.0',
    port: 9000,
    disableHostCheck: true,
    publicPath: '/',
    contentBase: path.join(process.cwd(), 'web'), // static file location
    historyApiFallback: true, // true for index.html upon 404, object for multiple paths
    noInfo: false,
    //stats: 'minimal',
    hot: true,  // hot module replacement. Depends on HotModuleReplacementPlugin
    // Allow web3 requests to route through webpack dev server (for HTTPS support)
    proxy: {
      '/web3/*': {
        target: 'http://localhost:2000'
      }
    }
  }
});
