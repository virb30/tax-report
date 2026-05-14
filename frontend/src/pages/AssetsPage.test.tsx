import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetType } from '@/types/api.types';
import type { TaxReportApi } from '@/services/api/tax-report-api';
import { setTaxReportApiForTesting } from '@/services/api/tax-report-api-provider';
import { AssetsPage } from './AssetsPage';
import { mockReset } from 'jest-mock-extended';
import mock, { type MockProxy } from 'jest-mock-extended/lib/Mock';
import type { AssetCatalogItem } from '@/types/api.types';

function createTaxReportApiMock(taxReportApiBaseMock: MockProxy<TaxReportApi>): TaxReportApi {
  mockReset(taxReportApiBaseMock);
  return {
    appName: 'tax-report',
    previewImportTransactions: taxReportApiBaseMock.previewImportTransactions,
    previewTransactionImport: taxReportApiBaseMock.previewTransactionImport,
    confirmImportTransactions: taxReportApiBaseMock.confirmImportTransactions,
    confirmTransactionImport: taxReportApiBaseMock.confirmTransactionImport,
    listDailyBrokerTaxes: taxReportApiBaseMock.listDailyBrokerTaxes,
    saveDailyBrokerTax: taxReportApiBaseMock.saveDailyBrokerTax,
    importDailyBrokerTaxes: taxReportApiBaseMock.importDailyBrokerTaxes,
    deleteDailyBrokerTax: taxReportApiBaseMock.deleteDailyBrokerTax,
    saveInitialBalanceDocument: taxReportApiBaseMock.saveInitialBalanceDocument,
    listInitialBalanceDocuments: taxReportApiBaseMock.listInitialBalanceDocuments,
    deleteInitialBalanceDocument: taxReportApiBaseMock.deleteInitialBalanceDocument,
    listPositions: taxReportApiBaseMock.listPositions,
    generateAssetsReport: taxReportApiBaseMock.generateAssetsReport,
    listMonthlyTaxHistory: taxReportApiBaseMock.listMonthlyTaxHistory,
    getMonthlyTaxDetail: taxReportApiBaseMock.getMonthlyTaxDetail,
    recalculateMonthlyTaxHistory: taxReportApiBaseMock.recalculateMonthlyTaxHistory,
    listAssets: taxReportApiBaseMock.listAssets,
    updateAsset: taxReportApiBaseMock.updateAsset,
    repairAssetType: taxReportApiBaseMock.repairAssetType,
    listBrokers: taxReportApiBaseMock.listBrokers,
    createBroker: taxReportApiBaseMock.createBroker,
    updateBroker: taxReportApiBaseMock.updateBroker,
    toggleBrokerActive: taxReportApiBaseMock.toggleBrokerActive,
    recalculatePosition: taxReportApiBaseMock.recalculatePosition,
    migrateYear: taxReportApiBaseMock.migrateYear,
    previewConsolidatedPosition: taxReportApiBaseMock.previewConsolidatedPosition,
    importConsolidatedPosition: taxReportApiBaseMock.importConsolidatedPosition,
    deletePosition: taxReportApiBaseMock.deletePosition,
    deleteAllPositions: taxReportApiBaseMock.deleteAllPositions,
  };
}

describe('AssetsPage', () => {
  const taxReportApi = mock<TaxReportApi>();
  let taxReportApiMock: TaxReportApi;

  beforeEach(() => {
    mockReset(taxReportApi);
    taxReportApiMock = createTaxReportApiMock(taxReportApi);
    setTaxReportApiForTesting(taxReportApiMock);
  });

  it('loads and displays assets', async () => {
    taxReportApi.listAssets.mockResolvedValue({
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
    taxReportApi.listAssets.mockResolvedValue({
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
    taxReportApi.updateAsset.mockResolvedValue({ success: true, asset: {} as AssetCatalogItem });

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
      expect(taxReportApi.updateAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: 'PETR4',
          cnpj: '90.400.888/0001-42',
        }),
      );
    });
  });

  it('triggers repairAssetType when asset type is changed', async () => {
    taxReportApi.listAssets.mockResolvedValue({
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
    taxReportApi.repairAssetType.mockResolvedValue({
      success: true,
      repair: {
        ticker: 'IVVB11',
        assetType: AssetType.Etf,
        affectedYears: [2024],
        reprocessedCount: 1,
      },
    });
    taxReportApi.updateAsset.mockResolvedValue({ success: true, asset: {} as AssetCatalogItem });

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
      expect(taxReportApi.repairAssetType).toHaveBeenCalledWith({
        ticker: 'IVVB11',
        assetType: AssetType.Etf,
      });
      expect(taxReportApi.updateAsset).toHaveBeenCalled();
    });
  });
});
