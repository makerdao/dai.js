const webpack = require('webpack');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const extractSass = new ExtractTextPlugin({
  filename: '[name].[contenthash].css'
});

module.exports = {
  entry: {
    app: './src/index.js'
  },
  output: {
    path: path.join(process.cwd(), 'dist'),
    filename: '[name].[hash].js',
    publicPath: '/',
    sourceMapFilename: '[name].map'
  },
  resolve: {
    extensions: ['.js'],  // extensions that are used
    modules: [path.join(process.cwd(), 'src'), 'node_modules'], // directories where to look for modules,
    alias: {
      'source-map-support': path.join(process.cwd(), 'src/utils/shim.js'),
      'fs': path.join(process.cwd(), 'src/utils/shim.js')
    }
  },
    devtool: 'source-map',
    plugins: [
      new CleanWebpackPlugin(['dist'], {root: process.cwd()}),
      new webpack.optimize.CommonsChunkPlugin({
        name: 'vendor'
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
    module: {
      noParse: [/dtrace-provider/, /safe-json-stringify/, /mv/],
      rules: [{
        enforce: 'pre', //to check source files, not modified by other loaders (like babel-loader)
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'eslint-loader'
      }, {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env', 'stage-2']
          }
        }
      },{
        test: /\.scss$/,
        use: extractSass.extract({
          use: [{
            loader: 'css-loader',
            options: {
              sourceMap: true
            }
          }, {
            loader: 'sass-loader',
            options: {
              sourceMap: true
            }
          }],
          // use style-loader in development
          fallback: 'style-loader'
        })
      }]
    },
    externals: [
      'child_process'
    ]
};