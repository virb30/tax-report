import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadBackendEnvironment } from './load-backend-environment';

describe('loadBackendEnvironment', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = { ...originalEnvironment };
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  it('loads environment variables from the backend .env file', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'tax-report-env-'));
    fs.writeFileSync(
      path.join(tempDirectory, '.env'),
      [
        '# Backend runtime configuration',
        'DATABASE_PATH=./data/dev.sqlite',
        'PORT=4010',
        'NODE_ENV="test"',
        'MAX_UPLOAD_BYTES=2048',
        'MAX_UPLOAD_FILES=2',
      ].join('\n'),
    );

    loadBackendEnvironment(tempDirectory);

    expect(process.env.DATABASE_PATH).toBe('./data/dev.sqlite');
    expect(process.env.PORT).toBe('4010');
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.MAX_UPLOAD_BYTES).toBe('2048');
    expect(process.env.MAX_UPLOAD_FILES).toBe('2');
  });

  it('keeps explicit process environment variables over .env defaults', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'tax-report-env-priority-'));
    fs.writeFileSync(
      path.join(tempDirectory, '.env'),
      'PORT=4010\nDATABASE_PATH=./data/dev.sqlite\n',
    );
    process.env.PORT = '9999';

    loadBackendEnvironment(tempDirectory);

    expect(process.env.PORT).toBe('9999');
    expect(process.env.DATABASE_PATH).toBe('./data/dev.sqlite');
  });

  it('does nothing when the .env file does not exist', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'tax-report-env-missing-'));

    expect(() => loadBackendEnvironment(tempDirectory)).not.toThrow();
  });
});
