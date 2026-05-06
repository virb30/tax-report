import {
  AssetResolutionStatus,
  AssetType,
  assertUniqueIpcContractMetadata,
  buildElectronApi,
  ipcFailure,
  ipcContracts,
  ipcSuccess,
  listAssetsContract,
  PendingIssueCode,
  ReportItemStatus,
  rendererExposedIpcContracts,
  TransactionType,
  UnsupportedImportReason,
  type ElectronApi,
  updateAssetSchema,
} from './index';

describe('ipc public entrypoint', () => {
  it('exports renderer API builders, contracts, and public DTO values from one entrypoint', async () => {
    const invoke = jest.fn<(channel: string, input?: unknown) => Promise<unknown>>();
    invoke.mockResolvedValue({ items: [] });
    const api = buildElectronApi({ invoke }, [listAssetsContract]) as Pick<
      ElectronApi,
      'appName' | 'listAssets'
    >;

    await api.listAssets({ pendingOnly: true });

    expect(api.appName).toBe('tax-report');
    expect(AssetType.Etf).toBe('etf');
    expect(ipcContracts).toContain(listAssetsContract);
    expect(rendererExposedIpcContracts).toContain(listAssetsContract);
    expect(invoke).toHaveBeenCalledWith(listAssetsContract.channel, { pendingOnly: true });
  });

  it('exports public IPC result helpers and registry validation', () => {
    assertUniqueIpcContractMetadata(ipcContracts);

    expect(ipcSuccess({ value: 'ok' })).toEqual({ ok: true, data: { value: 'ok' } });
    expect(
      ipcFailure({
        code: 'INVALID_PAYLOAD',
        message: 'Invalid payload.',
        kind: 'validation',
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Invalid payload.',
        kind: 'validation',
      },
    });
    expect(updateAssetSchema.parse({ ticker: 'IVVB11', assetType: AssetType.Etf })).toEqual({
      ticker: 'IVVB11',
      assetType: AssetType.Etf,
    });
  });

  it('exports stable public domain enum values from the IPC boundary', () => {
    expect(AssetType.Stock).toBe('stock');
    expect(AssetResolutionStatus.ManualOverride).toBe('manual_override');
    expect(UnsupportedImportReason.UnsupportedEvent).toBe('unsupported_event');
    expect(TransactionType.FractionAuction).toBe('fraction_auction');
    expect(ReportItemStatus.BelowThreshold).toBe('below_threshold');
    expect(PendingIssueCode.MissingIssuerCnpj).toBe('missing_issuer_cnpj');
  });
});
