import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import type { TaxReportApi } from './tax-report-api';
import { createTaxReportApiMock } from '../../test/create-tax-report-api-mock';

describe('TaxReportApi boundary', () => {
  it('provides centralized mocks that satisfy the frontend API interface', () => {
    const apiMock: TaxReportApi = createTaxReportApiMock();

    expect(apiMock.appName).toBe('tax-report');
    expect(apiMock.listBrokers).toBeDefined();
    expect(apiMock.previewImportTransactions).toBeDefined();
    expect(apiMock.confirmImportTransactions).toBeDefined();
  });

  it('keeps frontend source imports out of backend and retired transport internals', () => {
    const sourceFiles = collectSourceFiles(path.resolve(__dirname, '../..'));
    const forbiddenImportPattern =
      /from\s+['"][^'"]*(?:src\/main|src\/preload|src\/ipc|backend|ipc\/public|preload)['"]/;

    const offenders = sourceFiles.filter((sourceFile) => {
      const content = readFileSync(sourceFile, 'utf8');
      return forbiddenImportPattern.test(content);
    });

    expect(offenders).toEqual([]);
  });
});

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    const entryStats = statSync(entryPath);

    if (entryStats.isDirectory()) {
      return collectSourceFiles(entryPath);
    }

    if (!entryPath.endsWith('.ts') && !entryPath.endsWith('.tsx')) {
      return [];
    }

    return [entryPath];
  });
}
