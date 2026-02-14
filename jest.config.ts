import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  collectCoverage: true,
  collectCoverageFrom: ['src/main/**/*.ts', '!src/main/main.ts', 'src/preload.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '\\.d\\.ts$'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

export default config;
