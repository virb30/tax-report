import {
  AssetResolutionStatus,
  AssetType,
  PendingIssueCode,
  ReportItemStatus,
  SourceType,
  TransactionType,
  UnsupportedImportReason,
  type ParsedTransactionFile,
} from './domain';

describe('main shared domain types', () => {
  it('keeps backend-owned enum values stable without importing the public IPC boundary', () => {
    expect(AssetType.Etf).toBe('etf');
    expect(TransactionType.InitialBalance).toBe('initial_balance');
    expect(SourceType.Manual).toBe('manual');
    expect(AssetResolutionStatus.ResolvedFromCatalog).toBe('resolved_from_catalog');
    expect(UnsupportedImportReason.UnsupportedAssetType).toBe('unsupported_asset_type');
    expect(ReportItemStatus.Pending).toBe('pending');
    expect(PendingIssueCode.UnsupportedScope).toBe('unsupported_scope');
  });

  it('owns internal parsed transaction file shapes used by backend import modules', () => {
    const parsedFile: ParsedTransactionFile = {
      batches: [
        {
          tradeDate: '2025-01-03',
          brokerId: 'broker-1',
          totalOperationalCosts: 12.34,
          operations: [
            {
              ticker: 'PETR4',
              type: TransactionType.Buy,
              quantity: 10,
              unitPrice: 30,
              sourceAssetType: AssetType.Stock,
              sourceAssetTypeLabel: 'Acoes',
            },
          ],
        },
      ],
      unsupportedRows: [],
    };

    expect(parsedFile.batches[0]?.operations[0]?.type).toBe(TransactionType.Buy);
  });
});
