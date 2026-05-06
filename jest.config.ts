import type { Config } from 'jest';

const sharedProjectConfig = {
  preset: 'ts-jest',
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@main/(.*)$': '<rootDir>/src/main/$1',
  },
  transform: {
    '^.+\\.(t|j)sx?$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!uuid/)'],
} satisfies Partial<Config>;

const config: Config = {
  projects: [
    {
      ...sharedProjectConfig,
      displayName: 'main',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testPathIgnorePatterns: ['<rootDir>/src/renderer/'],
    },
    {
      ...sharedProjectConfig,
      displayName: 'renderer',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/src/renderer'],
    },
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/main/**/*.ts',
    '!src/main/main.ts',
    'src/ipc/**/*.ts',
    'src/preload/**/*.ts',
    '!src/main/__stubs__/**/*.ts',
    '!src/main/app/__stubs__/**/*.ts',
    '!src/main/app/infra/runtime/**/*.ts',
  ],
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
