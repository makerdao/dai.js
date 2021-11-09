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
  setupFilesAfterEnv: ['<rootDir>/test/setup-test.js'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/test/build.spec.js',
    '<rootDir>/test/integration/'
  ],
  testEnvironment : 'jsdom'
};
