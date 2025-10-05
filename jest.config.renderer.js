/** @type {import('jest').Config} */
export default {
  displayName: 'renderer',
  testEnvironment: 'jsdom',
  preset: 'ts-jest',
  testMatch: ['**/tests/unit/renderer/**/*.test.tsx', '**/tests/unit/renderer/**/*.test.ts'],
  collectCoverageFrom: ['src/renderer/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/renderer/index.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },
};
