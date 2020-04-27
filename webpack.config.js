const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: ['./src/index.js'],
  output: {
    path: path.join(process.cwd(), 'umd'),
    filename: 'index.js',
    sourceMapFilename: 'index.js.map',
    library: '@makerdao/dai-plugin-governance',
    libraryTarget: 'umd'
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: 4,
        sourceMap: true,
        terserOptions: {
          keep_fnames: true,
          module: true
        }
      })
    ]
  }
};
