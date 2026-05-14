import { createBackendRuntimeConfig } from './backend-runtime-config';

describe('createBackendRuntimeConfig', () => {
  it('accepts a valid SQLite path and resolves runtime defaults', () => {
    const config = createBackendRuntimeConfig(
      {
        DATABASE_PATH: './storage/app.sqlite',
        NODE_ENV: 'test',
      },
      '/srv/tax-report/backend',
    );

    expect(config).toEqual({
      environment: 'test',
      port: 3000,
      database: {
        sqlitePath: '/srv/tax-report/backend/storage/app.sqlite',
      },
      uploads: {
        maxFileSizeBytes: 10 * 1024 * 1024,
        maxFiles: 1,
      },
    });
  });

  it('rejects a missing required database path', () => {
    expect(() => createBackendRuntimeConfig({}, '/srv/tax-report/backend')).toThrow(
      'DATABASE_PATH is required',
    );
  });

  it('loads explicit port and upload limits', () => {
    const config = createBackendRuntimeConfig({
      DATABASE_PATH: '/data/tax.sqlite',
      PORT: '8080',
      MAX_UPLOAD_BYTES: '2048',
      MAX_UPLOAD_FILES: '3',
    });

    expect(config.port).toBe(8080);
    expect(config.uploads).toEqual({
      maxFileSizeBytes: 2048,
      maxFiles: 3,
    });
  });

  it('rejects invalid numeric configuration', () => {
    expect(() =>
      createBackendRuntimeConfig({
        DATABASE_PATH: '/data/tax.sqlite',
        PORT: '0',
      }),
    ).toThrow('PORT must be a positive integer');
  });
});
