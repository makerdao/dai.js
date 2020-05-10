const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const fs = require('fs');

const pkg = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
);

module.exports = {
  mode: 'production',
  entry: ['./src/index.js'],
  output: {
    path: path.join(process.cwd(), 'umd'),
    filename: 'index.js',
    sourceMapFilename: 'index.js.map',
    library: pkg.name,
    libraryTarget: 'umd'
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: ['@babel/plugin-transform-modules-commonjs']
          }
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

if (process.env.ANALYZE_BUNDLE) {
  const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
  module.exports.plugins = module.exports.plugins
    ? module.exports.plugins.concat([new BundleAnalyzerPlugin()])
    : [new BundleAnalyzerPlugin()];
}
