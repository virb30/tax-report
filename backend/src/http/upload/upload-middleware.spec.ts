import fs from 'node:fs';
import request from 'supertest';
import { createBackendApp } from '../app';
import { createMockBackendDependencies, createRuntimeConfig } from '../test/http-test-utils';

describe('upload middleware', () => {
  it('rejects unsupported file extensions', async () => {
    const dependencies = createMockBackendDependencies();
    dependencies.useCases.ingestion.previewImportUseCase.execute.mockResolvedValue({ ok: true });
    const backend = await createBackendApp({
      config: createRuntimeConfig(),
      dependencies: dependencies.dependencies,
    });

    const response = await request(backend.app)
      .post('/api/transactions/import:preview')
      .attach('file', Buffer.from('text'), 'transactions.txt');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(dependencies.useCases.ingestion.previewImportUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects oversized upload inputs', async () => {
    const dependencies = createMockBackendDependencies();
    const backend = await createBackendApp({
      config: createRuntimeConfig({ maxFileSizeBytes: 4 }),
      dependencies: dependencies.dependencies,
    });

    const response = await request(backend.app)
      .post('/api/transactions/import:preview')
      .attach('file', Buffer.from('too large'), 'transactions.csv');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('passes validated uploads to use cases and removes the temporary file after response', async () => {
    const dependencies = createMockBackendDependencies();
    let capturedPath = '';
    dependencies.useCases.ingestion.previewImportUseCase.execute.mockImplementation((input) => {
      const uploadInput = input as { filePath: string };
      capturedPath = uploadInput.filePath;
      expect(fs.existsSync(capturedPath)).toBe(true);
      return Promise.resolve({ imported: false });
    });
    const backend = await createBackendApp({
      config: createRuntimeConfig(),
      dependencies: dependencies.dependencies,
    });

    const response = await request(backend.app)
      .post('/api/transactions/import:preview')
      .attach('file', Buffer.from('Data,Ticker\n2025-01-01,ABCD3'), 'transactions.csv');

    await new Promise((resolve) => setImmediate(resolve));
    expect(response.status).toBe(200);
    expect(capturedPath).not.toBe('');
    expect(fs.existsSync(capturedPath)).toBe(false);
  });
});
