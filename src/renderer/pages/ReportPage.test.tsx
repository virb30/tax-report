import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetType, PendingIssueCode, ReportItemStatus } from '../../ipc/public';
import type { GenerateAssetsReportResult } from '../../ipc/public';
import type { ElectronApi } from '../../ipc/public';
import { ReportPage } from './ReportPage';
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
    listMonthlyTaxHistory: electronApiBaseMock.listMonthlyTaxHistory,
    getMonthlyTaxDetail: electronApiBaseMock.getMonthlyTaxDetail,
    recalculateMonthlyTaxHistory: electronApiBaseMock.recalculateMonthlyTaxHistory,
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
  const electronApi = mock<ElectronApi>();
  let windowElectronApi: ElectronApi;

  beforeEach(() => {
    mockReset(electronApi);
    windowElectronApi = createElectronApiMock(electronApi);
    window.electronApi = windowElectronApi;

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
    electronApi.generateAssetsReport.mockResolvedValue(createReportResult());

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
    electronApi.generateAssetsReport.mockResolvedValue(createReportResult());

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
    electronApi.generateAssetsReport.mockResolvedValue(createReportResult());
    electronApi.listAssets.mockResolvedValue({
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
    electronApi.updateAsset.mockResolvedValue({
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
      expect(electronApi.updateAsset).toHaveBeenCalled();
      expect(electronApi.generateAssetsReport).toHaveBeenCalledTimes(2);
    });
  });
});
