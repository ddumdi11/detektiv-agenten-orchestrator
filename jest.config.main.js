/** @type {import('jest').Config} */
export default {
  displayName: 'main',
  testEnvironment: 'node',
  preset: 'ts-jest',
  testMatch: ['**/tests/unit/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/main/**/*.ts',
    'src/agents/**/*.ts',
    'src/api/**/*.ts',
    'src/services/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main/preload.ts',
  ],
  coverageThreshold: {
    'src/agents/': {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
    'src/api/': {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
