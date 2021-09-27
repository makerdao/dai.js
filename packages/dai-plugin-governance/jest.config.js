module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|js)?$': 'ts-jest',
  },
  rootDir: './',
  coverageReporters: ['json', 'lcov', 'text-summary'],
  collectCoverageFrom: ['src/**/*.js', 'src/**/*.ts'],
  roots: ['src', 'test'],
  setupFilesAfterEnv: ['<rootDir>/test/config/original-setup.js'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/test/integration/'
  ],
  testEnvironment : 'jsdom'
};
