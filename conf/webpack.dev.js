const webpack = require('webpack');
const path = require('path');
const Merge = require('webpack-merge');
const CommonConfig = require('./webpack.common.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const extractSass = new ExtractTextPlugin({
  filename: '[name].[contenthash].css',
});

module.exports = Merge(CommonConfig, {
  entry: {
    app: './src/index.js',
    web: './web/index.js'
  },
  devtool: 'inline-source-map', // enhance debugging by adding meta info for the browser devtools
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: extractSass.extract({
          use: [
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
            },
          ],
          // use style-loader in development
          fallback: 'style-loader',
        }),
      }
    ]
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({

    }),
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
    hot: true  // hot module replacement. Depends on HotModuleReplacementPlugin
  }
});