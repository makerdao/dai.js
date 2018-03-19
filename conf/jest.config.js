const path = require('path');

module.exports = {
  roots: [
    path.join(process.cwd(), '/src/'),
    path.join(process.cwd(), '/test/')
  ],
  testRegex: "test/.*.spec.js$",
  collectCoverage: true,
  verbose: true
};