const path = require('path');

module.exports = {
  rootDir: path.join(process.cwd(), ''),
  testRegex: "test/.*.spec.js$",
  collectCoverage: true,
  verbose: true
};