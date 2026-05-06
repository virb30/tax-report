import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetType } from '../../ipc/public';
import type { ElectronApi } from '../../ipc/public';
import { AssetsPage } from './AssetsPage';
import { mockReset } from 'jest-mock-extended';
import mock, { type MockProxy } from 'jest-mock-extended/lib/Mock';
import type { AssetCatalogItem } from '../../ipc/public';

function createElectronApiMock(electronApiBaseMock: MockProxy<ElectronApi>): ElectronApi {
  mockReset(electronApiBaseMock);
  return {
    appName: 'tax-report',
    importSelectFile: electronApiBaseMock.importSelectFile,
    previewImportTransactions: electronApiBaseMock.previewImportTransactions,
    confirmImportTransactions: electronApiBaseMock.confirmImportTransactions,
    listDailyBrokerTaxes: electronApiBaseMock.listDailyBrokerTaxes,
    saveDailyBrokerTax: electronApiBaseMock.saveDailyBrokerTax,
    importDailyBrokerTaxes: electronApiBaseMock.importDailyBrokerTaxes,
    deleteDailyBrokerTax: electronApiBaseMock.deleteDailyBrokerTax,
    saveInitialBalanceDocument: electronApiBaseMock.saveInitialBalanceDocument,
    listInitialBalanceDocuments: electronApiBaseMock.listInitialBalanceDocuments,
    deleteInitialBalanceDocument: electronApiBaseMock.deleteInitialBalanceDocument,
    listPositions: electronApiBaseMock.listPositions,
    generateAssetsReport: electronApiBaseMock.generateAssetsReport,
    listAssets: electronApiBaseMock.listAssets,
    updateAsset: electronApiBaseMock.updateAsset,
    repairAssetType: electronApiBaseMock.repairAssetType,
    listBrokers: electronApiBaseMock.listBrokers,
    createBroker: electronApiBaseMock.createBroker,
    updateBroker: electronApiBaseMock.updateBroker,
    toggleBrokerActive: electronApiBaseMock.toggleBrokerActive,
    recalculatePosition: electronApiBaseMock.recalculatePosition,
    migrateYear: electronApiBaseMock.migrateYear,
    previewConsolidatedPosition: electronApiBaseMock.previewConsolidatedPosition,
    importConsolidatedPosition: electronApiBaseMock.importConsolidatedPosition,
    deletePosition: electronApiBaseMock.deletePosition,
    deleteAllPositions: electronApiBaseMock.deleteAllPositions,
  };
}

describe('AssetsPage', () => {
  const electronApi = mock<ElectronApi>();
  let windowElectronApi: ElectronApi;

  beforeEach(() => {
    mockReset(electronApi);
    windowElectronApi = createElectronApiMock(electronApi);
    window.electronApi = windowElectronApi;
  });

  it('loads and displays assets', async () => {
    electronApi.listAssets.mockResolvedValue({
      items: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          name: 'Petrobras',
          cnpj: '90.400.888/0001-42',
          resolutionSource: null,
          isReportReadyMetadata: true,
        },
      ],
    });

    render(<AssetsPage />);

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeTruthy();
      expect(screen.getByText('Petrobras')).toBeTruthy();
      expect(screen.getAllByText('Acoes').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('opens edit modal and saves changes', async () => {
    electronApi.listAssets.mockResolvedValue({
      items: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          name: 'Petrobras',
          cnpj: null,
          resolutionSource: null,
          isReportReadyMetadata: false,
        },
      ],
    });
    electronApi.updateAsset.mockResolvedValue({ success: true, asset: {} as AssetCatalogItem });

    const user = userEvent.setup();
    render(<AssetsPage />);

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Editar' }));

    const cnpjInput = screen.getByPlaceholderText('00.000.000/0000-00');
    await user.type(cnpjInput, '90.400.888/0001-42');

    const saveForm = screen.getByRole('button', { name: 'Salvar Alteracoes' }).closest('form');
    expect(saveForm).not.toBeNull();
    fireEvent.submit(saveForm as HTMLFormElement);

    await waitFor(() => {
      expect(electronApi.updateAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: 'PETR4',
          cnpj: '90.400.888/0001-42',
        }),
      );
    });
  });

  it('triggers repairAssetType when asset type is changed', async () => {
    electronApi.listAssets.mockResolvedValue({
      items: [
        {
          ticker: 'IVVB11',
          assetType: AssetType.Stock,
          name: 'IVVB11 ETF',
          cnpj: null,
          resolutionSource: null,
          isReportReadyMetadata: false,
        },
      ],
    });
    electronApi.repairAssetType.mockResolvedValue({
      success: true,
      repair: {
        ticker: 'IVVB11',
        assetType: AssetType.Etf,
        affectedYears: [2024],
        reprocessedCount: 1,
      },
    });
    electronApi.updateAsset.mockResolvedValue({ success: true, asset: {} as AssetCatalogItem });

    const user = userEvent.setup();
    render(<AssetsPage />);

    await waitFor(() => {
      expect(screen.getByText('IVVB11')).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Editar' }));

    const typeSelect = screen.getByRole('combobox');
    await user.selectOptions(typeSelect, AssetType.Etf);

    const saveForm = screen.getByRole('button', { name: 'Salvar Alteracoes' }).closest('form');
    expect(saveForm).not.toBeNull();
    fireEvent.submit(saveForm as HTMLFormElement);

    await waitFor(() => {
      expect(electronApi.repairAssetType).toHaveBeenCalledWith({
        ticker: 'IVVB11',
        assetType: AssetType.Etf,
      });
      expect(electronApi.updateAsset).toHaveBeenCalled();
    });
  });
});
