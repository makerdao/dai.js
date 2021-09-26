module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|js)?$': 'ts-jest',
  },
  rootDir: './',
  coverageReporters: ['json', 'lcov', 'text-summary'],
  collectCoverageFrom: ['src/**/*.js', 'src/**/*.ts'],
  globalSetup: '<rootDir>/test/setup-global.js',
  roots: ['src', 'test'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/test/integration/'
  ],
  testEnvironment : 'jsdom'
};
