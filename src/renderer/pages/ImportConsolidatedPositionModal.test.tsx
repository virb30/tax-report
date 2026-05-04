import { jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ElectronApi } from '../../preload/renderer/electron-api';
import { ImportConsolidatedPositionModal } from './ImportConsolidatedPositionModal';
import { AssetType, AssetResolutionStatus } from '../../shared/types/domain';

function getButton(name: string): HTMLButtonElement {
  const element = screen.getByRole('button', { name });
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Expected "${name}" to be a button element.`);
  }

  return element;
}

function createElectronApiMock(): ElectronApi {
  return {
    appName: 'tax-report',
    importSelectFile: jest.fn<ElectronApi['importSelectFile']>(),
    previewImportTransactions: jest.fn<ElectronApi['previewImportTransactions']>(),
    confirmImportTransactions: jest.fn<ElectronApi['confirmImportTransactions']>(),
    listDailyBrokerTaxes: jest.fn<ElectronApi['listDailyBrokerTaxes']>(),
    saveDailyBrokerTax: jest.fn<ElectronApi['saveDailyBrokerTax']>(),
    importDailyBrokerTaxes: jest.fn<ElectronApi['importDailyBrokerTaxes']>(),
    deleteDailyBrokerTax: jest.fn<ElectronApi['deleteDailyBrokerTax']>(),
    saveInitialBalanceDocument: jest.fn<ElectronApi['saveInitialBalanceDocument']>(),
    listInitialBalanceDocuments: jest.fn<ElectronApi['listInitialBalanceDocuments']>(),
    deleteInitialBalanceDocument: jest.fn<ElectronApi['deleteInitialBalanceDocument']>(),
    listPositions: jest.fn<ElectronApi['listPositions']>(),
    generateAssetsReport: jest.fn<ElectronApi['generateAssetsReport']>(),
    listAssets: jest.fn<ElectronApi['listAssets']>(),
    updateAsset: jest.fn<ElectronApi['updateAsset']>(),
    repairAssetType: jest.fn<ElectronApi['repairAssetType']>(),
    listBrokers: jest.fn<ElectronApi['listBrokers']>(),
    createBroker: jest.fn<ElectronApi['createBroker']>(),
    updateBroker: jest.fn<ElectronApi['updateBroker']>(),
    toggleBrokerActive: jest.fn<ElectronApi['toggleBrokerActive']>(),
    recalculatePosition: jest.fn<ElectronApi['recalculatePosition']>(),
    migrateYear: jest.fn<ElectronApi['migrateYear']>(),
    previewConsolidatedPosition: jest.fn<ElectronApi['previewConsolidatedPosition']>(),
    importConsolidatedPosition: jest.fn<ElectronApi['importConsolidatedPosition']>(),
    deletePosition: jest.fn<ElectronApi['deletePosition']>(),
    deleteAllPositions: jest.fn<ElectronApi['deleteAllPositions']>(),
  };
}

describe('ImportConsolidatedPositionModal', () => {
  let electronApi: ElectronApi;

  beforeEach(() => {
    electronApi = createElectronApiMock();
    window.electronApi = electronApi;
  });

  it('does not render when closed', () => {
    render(
      <ImportConsolidatedPositionModal isOpen={false} onClose={jest.fn()} onSuccess={jest.fn()} />,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('selects a file, loads preview rows and confirms import', async () => {
    jest
      .mocked(electronApi.importSelectFile)
      .mockResolvedValue({ filePath: 'C:/tmp/positions.csv' });
    jest.mocked(electronApi.previewConsolidatedPosition).mockResolvedValue({
      ok: true,
      data: {
        rows: [
          {
            ticker: 'PETR4',
            quantity: 10,
            averagePrice: 30,
            brokerCode: 'XP',
            sourceAssetType: AssetType.Stock,
            resolvedAssetType: AssetType.Stock,
            resolutionStatus: AssetResolutionStatus.ResolvedFromFile,
            needsReview: false,
            unsupportedReason: null,
          },
        ],
        summary: {
          supportedRows: 1,
          pendingRows: 1,
          unsupportedRows: 0,
        },
      },
    });
    jest.mocked(electronApi.importConsolidatedPosition).mockResolvedValue({
      ok: true,
      data: {
        importedCount: 1,
        recalculatedTickers: ['PETR4'],
        skippedUnsupportedRows: 0,
      },
    });

    const onSuccess = jest.fn();
    const user = userEvent.setup();
    render(<ImportConsolidatedPositionModal isOpen onClose={jest.fn()} onSuccess={onSuccess} />);

    await user.click(getButton('Selecionar arquivo'));

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeTruthy();
    });
    expect(electronApi.previewConsolidatedPosition).toHaveBeenCalledWith({
      filePath: 'C:/tmp/positions.csv',
    });

    await user.click(getButton('Confirmar importação'));

    await waitFor(() => {
      expect(electronApi.importConsolidatedPosition).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: 'C:/tmp/positions.csv',
          year: expect.any(Number),
          assetTypeOverrides: [],
        }),
      );
    });
    expect(screen.getByText(/1 alocação\(ões\) importada\(s\)/)).toBeTruthy();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('shows preview error and keeps confirmation disabled when preview result fails', async () => {
    jest
      .mocked(electronApi.importSelectFile)
      .mockResolvedValue({ filePath: 'C:/tmp/positions.csv' });
    jest.mocked(electronApi.previewConsolidatedPosition).mockResolvedValue({
      ok: false,
      error: {
        code: 'INVALID_CONSOLIDATED_POSITION_FILE',
        kind: 'validation',
        message: 'Planilha inválida.',
      },
    });

    const user = userEvent.setup();
    render(<ImportConsolidatedPositionModal isOpen onClose={jest.fn()} onSuccess={jest.fn()} />);

    await user.click(getButton('Selecionar arquivo'));

    await waitFor(() => {
      expect(screen.getByText('Planilha inválida.')).toBeTruthy();
    });
    expect(getButton('Confirmar importação').disabled).toBe(true);
  });
});
