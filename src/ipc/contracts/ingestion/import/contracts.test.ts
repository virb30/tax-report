import { AssetType } from '../../domain';
import {
  confirmImportTransactionsContract,
  confirmImportTransactionsSchema,
  importSelectFileContract,
  previewImportTransactionsContract,
  previewImportTransactionsSchema,
} from './contracts';

describe('ingestion import contracts', () => {
  it('preserves import channel names and throw error modes', () => {
    expect(
      [
        importSelectFileContract,
        previewImportTransactionsContract,
        confirmImportTransactionsContract,
      ].map((contract) => ({
        apiName: contract.api?.name,
        channel: contract.channel,
        errorMode: contract.errorMode,
        id: contract.id,
      })),
    ).toEqual([
      {
        apiName: 'importSelectFile',
        channel: 'import:select-file',
        errorMode: 'throw',
        id: 'import.selectFile',
      },
      {
        apiName: 'previewImportTransactions',
        channel: 'import:preview-transactions',
        errorMode: 'throw',
        id: 'import.previewTransactions',
      },
      {
        apiName: 'confirmImportTransactions',
        channel: 'import:confirm-transactions',
        errorMode: 'throw',
        id: 'import.confirmTransactions',
      },
    ]);
  });

  it('validates preview import payloads', () => {
    expect(previewImportTransactionsSchema.parse({ filePath: ' /tmp/operations.csv ' })).toEqual({
      filePath: '/tmp/operations.csv',
    });
    expect(() => previewImportTransactionsSchema.parse({ filePath: ' ' })).toThrow();
  });

  it('validates confirm import payloads with asset type overrides', () => {
    expect(
      confirmImportTransactionsSchema.parse({
        filePath: ' /tmp/operations.csv ',
        assetTypeOverrides: [{ ticker: ' IVVB11 ', assetType: AssetType.Etf }],
      }),
    ).toEqual({
      filePath: '/tmp/operations.csv',
      assetTypeOverrides: [{ ticker: 'IVVB11', assetType: AssetType.Etf }],
    });
    expect(() =>
      confirmImportTransactionsSchema.parse({
        filePath: '/tmp/operations.csv',
        assetTypeOverrides: [{ ticker: 'IVVB11', assetType: 'crypto' }],
      }),
    ).toThrow();
  });
});
