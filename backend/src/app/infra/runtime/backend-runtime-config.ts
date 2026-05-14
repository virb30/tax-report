import path from 'node:path';

const DATABASE_PATH_ENV = 'DATABASE_PATH';
const PORT_ENV = 'PORT';
const NODE_ENV_ENV = 'NODE_ENV';
const MAX_UPLOAD_BYTES_ENV = 'MAX_UPLOAD_BYTES';
const MAX_UPLOAD_FILES_ENV = 'MAX_UPLOAD_FILES';
const DEFAULT_PORT = 3000;
const DEFAULT_UPLOAD_BYTES = 10 * 1024 * 1024;
const DEFAULT_UPLOAD_FILES = 1;

export type BackendEnvironment = 'development' | 'test' | 'production';

export interface BackendRuntimeConfig {
  environment: BackendEnvironment;
  port: number;
  database: {
    sqlitePath: string;
  };
  uploads: {
    maxFileSizeBytes: number;
    maxFiles: number;
  };
}

function parseEnvironment(value: string | undefined): BackendEnvironment {
  if (value === 'test' || value === 'production') {
    return value;
  }

  return 'development';
}

function parsePositiveInteger(input: {
  key: string;
  value: string | undefined;
  defaultValue: number;
}): number {
  const { defaultValue, key, value } = input;

  if (!value?.trim()) {
    return defaultValue;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }

  return parsedValue;
}

export function createBackendRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
  currentDirectory: string = process.cwd(),
): BackendRuntimeConfig {
  const configuredPath = env[DATABASE_PATH_ENV]?.trim();

  if (!configuredPath) {
    throw new Error(`${DATABASE_PATH_ENV} is required`);
  }

  return {
    environment: parseEnvironment(env[NODE_ENV_ENV]),
    port: parsePositiveInteger({
      key: PORT_ENV,
      value: env[PORT_ENV],
      defaultValue: DEFAULT_PORT,
    }),
    database: {
      sqlitePath: path.resolve(currentDirectory, configuredPath),
    },
    uploads: {
      maxFileSizeBytes: parsePositiveInteger({
        key: MAX_UPLOAD_BYTES_ENV,
        value: env[MAX_UPLOAD_BYTES_ENV],
        defaultValue: DEFAULT_UPLOAD_BYTES,
      }),
      maxFiles: parsePositiveInteger({
        key: MAX_UPLOAD_FILES_ENV,
        value: env[MAX_UPLOAD_FILES_ENV],
        defaultValue: DEFAULT_UPLOAD_FILES,
      }),
    },
  };
}
