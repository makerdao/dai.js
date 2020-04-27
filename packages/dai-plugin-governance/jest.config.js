module.exports = {
  rootDir: './',
  coverageReporters: ['json', 'lcov', 'text-summary'],
  collectCoverageFrom: ['src/**/*.js'],
  roots: ['src', 'test'],
  setupFilesAfterEnv: ['<rootDir>/test/config/original-setup.js'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/test/integration/'
  ]
};
