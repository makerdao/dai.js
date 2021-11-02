module.exports = {
    preset: 'ts-jest',
    transform: {
      '^.+\\.(ts|js)?$': 'ts-jest',
    },
    coverageReporters: ['json', 'lcov', 'text-summary'],
    collectCoverageFrom: ['src/**/*.js', 'src/**/*.ts'],
    testEnvironment : 'jsdom'
  };
  