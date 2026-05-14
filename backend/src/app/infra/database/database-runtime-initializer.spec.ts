import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDatabaseConnection } from './database';
import { initializeConfiguredDatabase } from './database-runtime-initializer';

describe('initializeConfiguredDatabase', () => {
  const originalDatabasePath = process.env.DATABASE_PATH;
  const originalPort = process.env.PORT;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalMaxUploadBytes = process.env.MAX_UPLOAD_BYTES;
  const originalMaxUploadFiles = process.env.MAX_UPLOAD_FILES;

  afterEach(() => {
    if (originalDatabasePath === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = originalDatabasePath;
    }

    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalMaxUploadBytes === undefined) {
      delete process.env.MAX_UPLOAD_BYTES;
    } else {
      process.env.MAX_UPLOAD_BYTES = originalMaxUploadBytes;
    }

    if (originalMaxUploadFiles === undefined) {
      delete process.env.MAX_UPLOAD_FILES;
    } else {
      process.env.MAX_UPLOAD_FILES = originalMaxUploadFiles;
    }
  });

  it('loads backend environment and initializes the configured sqlite database', async () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'tax-report-runtime-init-'));
    fs.writeFileSync(
      path.join(tempDirectory, '.env'),
      ['DATABASE_PATH=./data/runtime.sqlite', 'PORT=4010', 'NODE_ENV=development'].join('\n'),
    );

    delete process.env.DATABASE_PATH;
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.MAX_UPLOAD_BYTES;
    delete process.env.MAX_UPLOAD_FILES;

    const databasePath = await initializeConfiguredDatabase(tempDirectory);
    const database = createDatabaseConnection(databasePath);
    const brokersTable = await database('sqlite_master')
      .where({ type: 'table', name: 'brokers' })
      .first<{ name: string }>();

    await database.destroy();

    expect(databasePath).toBe(path.join(tempDirectory, 'data', 'runtime.sqlite'));
    expect(fs.existsSync(databasePath)).toBe(true);
    expect(brokersTable).toBeDefined();
  });
});
