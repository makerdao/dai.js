module.exports = {
  preset: 'ts-jest',
  coverageReporters: ['json', 'lcov', 'text-summary'],
  collectCoverageFrom: ['src/**/*.js']
};
