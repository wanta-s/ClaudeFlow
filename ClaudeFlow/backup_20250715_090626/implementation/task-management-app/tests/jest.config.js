module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/unit', '<rootDir>/integration'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    '../backend/src/**/*.ts',
    '!../backend/src/**/*.d.ts',
    '!../backend/src/index.ts',
    '!../backend/src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85
    }
  },
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/../backend/src/$1'
  }
};