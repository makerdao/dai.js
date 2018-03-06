const path = require('path');

module.exports = {
  rootDir: path.join(process.cwd(), 'src'),
  testRegex: "./test/.*.js$",
  collectCoverage: true,
  verbose: true
};