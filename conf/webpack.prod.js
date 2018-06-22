const webpack = require('webpack');
const Merge = require('webpack-merge');
const CommonConfig = require('./webpack.common.js');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');


module.exports = Merge(CommonConfig, {
  entry: {
    app: ['babel-polyfill', './src/index.js']
  },
  module: {
    rules: [
      {
        enforce: 'pre', //to check source files, not modified by other loaders (like babel-loader)
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'eslint-loader',
        options: {
          'ignorePattern': '**/*.scss'
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Maker.js demo'
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false
    }),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new UglifyJSPlugin({ uglifyOptions: {
      beautify: false,
      mangle: {
        keep_fnames: true
      },
      comments: false
    } 
    })
  ],
  externals: [
    'child_process'
  ]
});