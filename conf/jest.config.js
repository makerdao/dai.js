const path = require('path');

module.exports = {
  rootDir: process.cwd(),
  roots: [
    path.join(process.cwd(), '/src/'),
    path.join(process.cwd(), '/test/')
  ],
  testRegex: 'test/.*.spec.js$',
  //collectCoverage: true,
  verbose: true,
  globalSetup: path.join(process.cwd(), '/test/setup-global.js'),
  setupTestFrameworkScriptFile: path.join(process.cwd(), '/test/setup-test.js')
};