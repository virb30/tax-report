import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetType, PendingIssueCode, ReportItemStatus } from '@/types/api.types';
import type { GenerateAssetsReportResult } from '@/types/api.types';
import type { TaxReportApi } from '@/services/api/tax-report-api';
import { setTaxReportApiForTesting } from '@/services/api/tax-report-api-provider';
import { ReportPage } from './ReportPage';
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

function createReportResult(): GenerateAssetsReportResult {
  return {
    referenceDate: '31/12/2025',
    items: [
      {
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        totalQuantity: 100,
        averagePrice: 35.5,
        previousYearValue: 3000,
        currentYearValue: 3550,
        acquiredInYear: false,
        revenueClassification: { group: '03', code: '01' },
        status: ReportItemStatus.Required,
        eligibilityReason: 'Obrigatorio por saldo',
        pendingIssues: [],
        canCopy: true,
        description: '100 acoes de PETR4...',
        brokersSummary: [
          {
            brokerId: 'xp',
            brokerName: 'XP',
            cnpj: '00.000.000/0001-00',
            quantity: 100,
            totalCost: 3550,
          },
        ],
      },
      {
        ticker: 'VALE3',
        assetType: AssetType.Stock,
        totalQuantity: 50,
        averagePrice: 80,
        previousYearValue: 0,
        currentYearValue: 4000,
        acquiredInYear: true,
        revenueClassification: { group: '03', code: '01' },
        status: ReportItemStatus.Pending,
        eligibilityReason: 'Falta CNPJ',
        pendingIssues: [
          { code: PendingIssueCode.MissingIssuerCnpj, message: 'Falta CNPJ do emissor' },
        ],
        canCopy: false,
        description: null,
        brokersSummary: [
          {
            brokerId: 'xp',
            brokerName: 'XP',
            cnpj: '00.000.000/0001-00',
            quantity: 50,
            totalCost: 4000,
          },
        ],
      },
    ],
  };
}

describe('ReportPage', () => {
  const taxReportApi = mock<TaxReportApi>();
  let taxReportApiMock: TaxReportApi;

  beforeEach(() => {
    mockReset(taxReportApi);
    taxReportApiMock = createTaxReportApiMock(taxReportApi);
    setTaxReportApiForTesting(taxReportApiMock);

    // Mock clipboard
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    };
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      configurable: true,
    });
  });

  it('generates and displays grouped report items', async () => {
    taxReportApi.generateAssetsReport.mockResolvedValue(createReportResult());

    const user = userEvent.setup();
    render(<ReportPage />);

    await user.click(screen.getByRole('button', { name: 'Gerar Relatorio' }));

    await waitFor(() => {
      expect(screen.getByText('Prontos para Declaracao')).toBeTruthy();
      expect(screen.getByText('Pendencias de Dados')).toBeTruthy();
    });

    expect(screen.getByText('PETR4')).toBeTruthy();
    expect(screen.getByText('VALE3')).toBeTruthy();
    expect(screen.getByText(/Falta CNPJ do emissor/)).toBeTruthy();
  });

  it('gates copy actions for ready items only', async () => {
    taxReportApi.generateAssetsReport.mockResolvedValue(createReportResult());

    const user = userEvent.setup();
    render(<ReportPage />);

    await user.click(screen.getByRole('button', { name: 'Gerar Relatorio' }));

    await waitFor(() => {
      const copyButtons = screen.getAllByRole('button', { name: 'Copiar Descricao' });
      expect((copyButtons[0] as HTMLButtonElement).disabled).toBe(false); // PETR4
      expect((copyButtons[1] as HTMLButtonElement).disabled).toBe(true); // VALE3
    });
  });

  it('triggers repair flow and refreshes report after success', async () => {
    taxReportApi.generateAssetsReport.mockResolvedValue(createReportResult());
    taxReportApi.listAssets.mockResolvedValue({
      items: [
        {
          ticker: 'VALE3',
          assetType: AssetType.Stock,
          name: 'Vale S.A.',
          cnpj: null,
          resolutionSource: null,
          isReportReadyMetadata: false,
        },
      ],
    });
    taxReportApi.updateAsset.mockResolvedValue({
      success: true,
      asset: {} as unknown as AssetCatalogItem,
    });

    const user = userEvent.setup();
    render(<ReportPage />);

    await user.click(screen.getByRole('button', { name: 'Gerar Relatorio' }));

    await waitFor(() => {
      expect(screen.getByText('VALE3')).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Corrigir Dados' }));

    await waitFor(() => {
      expect(screen.getByText('Editar Ativo: VALE3')).toBeTruthy();
    });

    const cnpjInput = screen.getByPlaceholderText('00.000.000/0000-00');
    await user.clear(cnpjInput);
    await user.type(cnpjInput, '33.592.510/0001-54');

    const saveForm = screen.getByRole('button', { name: 'Salvar Alteracoes' }).closest('form');
    expect(saveForm).not.toBeNull();
    fireEvent.submit(saveForm as HTMLFormElement);

    await waitFor(() => {
      expect(taxReportApi.updateAsset).toHaveBeenCalled();
      expect(taxReportApi.generateAssetsReport).toHaveBeenCalledTimes(2);
    });
  });
});
