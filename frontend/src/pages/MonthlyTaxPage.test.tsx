import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MonthlyTaxCloseDetail, MonthlyTaxCloseSummary } from '@/types/api.types';
import type { TaxReportApi } from '@/services/api/tax-report-api';
import { setTaxReportApiForTesting } from '@/services/api/tax-report-api-provider';
import { MonthlyTaxPage } from './MonthlyTaxPage';
import { mockReset } from 'jest-mock-extended';
import mock, { type MockProxy } from 'jest-mock-extended/lib/Mock';

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

function createMonth(overrides: Partial<MonthlyTaxCloseSummary> = {}): MonthlyTaxCloseSummary {
  return {
    month: '2025-01',
    state: 'closed',
    outcome: 'no_tax',
    calculationVersion: 'v1',
    inputFingerprint: 'fingerprint',
    calculatedAt: '2026-05-07T10:00:00.000Z',
    netTaxDue: '0.00',
    carryForwardOut: '0.00',
    changeSummary: null,
    ...overrides,
  };
}

function createDetail(overrides: Partial<MonthlyTaxCloseDetail> = {}): MonthlyTaxCloseDetail {
  return {
    summary: {
      month: '2025-03',
      state: 'closed',
      outcome: 'tax_due',
      grossSales: '25000.00',
      realizedResult: '1000.00',
      taxBeforeCredits: '150.00',
      irrfCreditUsed: '10.00',
      netTaxDue: '140.00',
    },
    groups: [
      {
        code: 'geral-comum',
        label: 'Geral - Comum',
        grossSales: '25000.00',
        realizedResult: '1000.00',
        carriedLossIn: '0.00',
        carriedLossOut: '0.00',
        taxableBase: '1000.00',
        taxRate: '15.00',
        taxDue: '150.00',
        irrfCreditUsed: '10.00',
      },
      {
        code: 'geral-isento',
        label: 'Geral - Isento',
        grossSales: '0.00',
        realizedResult: '0.00',
        carriedLossIn: '0.00',
        carriedLossOut: '0.00',
        taxableBase: '0.00',
        taxRate: '0.00',
        taxDue: '0.00',
        irrfCreditUsed: '0.00',
      },
      {
        code: 'fii',
        label: 'FII',
        grossSales: '0.00',
        realizedResult: '0.00',
        carriedLossIn: '0.00',
        carriedLossOut: '0.00',
        taxableBase: '0.00',
        taxRate: '20.00',
        taxDue: '0.00',
        irrfCreditUsed: '0.00',
      },
    ],
    blockedReasons: [],
    disclosures: [
      {
        code: 'manual_input_used',
        severity: 'review',
        message: 'Resultado usa dado manual informado pelo usuario.',
      },
    ],
    carryForward: {
      openingCommonLoss: '0.00',
      closingCommonLoss: '0.00',
      openingFiiLoss: '0.00',
      closingFiiLoss: '0.00',
      openingIrrfCredit: '0.00',
      closingIrrfCredit: '0.00',
      openingBelowThresholdTax: '0.00',
      closingBelowThresholdTax: '0.00',
    },
    saleLines: [
      {
        id: 'sale-1',
        date: '2025-03-10',
        ticker: 'PETR4',
        brokerId: 'broker-xp',
        groupCode: 'geral-comum',
        assetClass: 'stock',
        quantity: '100',
        grossAmount: '25000.00',
        costBasis: '24000.00',
        fees: '12.34',
        netSaleValue: '24987.66',
        realizedResult: '987.66',
        allocatedIrrf: '10.00',
      },
    ],
    ...overrides,
  };
}

describe('MonthlyTaxPage', () => {
  const taxReportApi = mock<TaxReportApi>();

  beforeEach(() => {
    setTaxReportApiForTesting(createTaxReportApiMock(taxReportApi));
  });

  it('loads and displays monthly tax history', async () => {
    taxReportApi.listMonthlyTaxHistory.mockResolvedValue({
      months: [
        createMonth({
          month: '2025-03',
          state: 'closed',
          outcome: 'tax_due',
          netTaxDue: '125.30',
        }),
      ],
    });

    render(<MonthlyTaxPage />);

    expect(screen.getByText('Carregando historico mensal...')).toBeTruthy();

    await waitFor(() => {
      expect(taxReportApi.listMonthlyTaxHistory).toHaveBeenCalledTimes(1);
      expect(screen.getByText('03/2025')).toBeTruthy();
      expect(screen.getByText('Fechado')).toBeTruthy();
      expect(screen.getByText('R$ 125.30')).toBeTruthy();
    });
  });

  it('shows an empty-history message', async () => {
    taxReportApi.listMonthlyTaxHistory.mockResolvedValue({ months: [] });

    render(<MonthlyTaxPage />);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum historico mensal encontrado/)).toBeTruthy();
    });
  });

  it('renders distinct labels for all monthly states', async () => {
    taxReportApi.listMonthlyTaxHistory.mockResolvedValue({
      months: [
        createMonth({ month: '2025-01', state: 'closed' }),
        createMonth({ month: '2025-02', state: 'blocked', outcome: 'blocked' }),
        createMonth({ month: '2025-03', state: 'obsolete' }),
        createMonth({
          month: '2025-04',
          state: 'needs_review',
          changeSummary: 'Recalculo alterou o resultado.',
        }),
        createMonth({ month: '2025-05', state: 'below_threshold', outcome: 'below_threshold' }),
      ],
    });

    render(<MonthlyTaxPage />);

    await waitFor(() => {
      expect(screen.getByText('Fechado')).toBeTruthy();
      expect(screen.getByText('Bloqueado')).toBeTruthy();
      expect(screen.getByText('Desatualizado')).toBeTruthy();
      expect(screen.getByText('Revisar')).toBeTruthy();
      expect(screen.getByText('Abaixo de R$ 10,00')).toBeTruthy();
      expect(screen.getByText('Recalculo alterou o resultado.')).toBeTruthy();
    });
  });

  it('surfaces backend fetch failures and allows retry', async () => {
    taxReportApi.listMonthlyTaxHistory
      .mockRejectedValueOnce(new Error('Falha ao carregar historico mensal.'))
      .mockResolvedValueOnce({ months: [createMonth()] });

    const user = userEvent.setup();
    render(<MonthlyTaxPage />);

    await waitFor(() => {
      expect(screen.getByText('Falha ao carregar historico mensal.')).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Atualizar' }));

    await waitFor(() => {
      expect(screen.getByText('01/2025')).toBeTruthy();
      expect(taxReportApi.listMonthlyTaxHistory).toHaveBeenCalledTimes(2);
    });
  });

  it('loads selected month detail and renders fixed backend groups', async () => {
    taxReportApi.listMonthlyTaxHistory.mockResolvedValue({
      months: [createMonth({ month: '2025-03', outcome: 'tax_due', netTaxDue: '140.00' })],
    });
    taxReportApi.getMonthlyTaxDetail.mockResolvedValue({ detail: createDetail() });

    const user = userEvent.setup();
    render(<MonthlyTaxPage />);

    await user.click(await screen.findByRole('button', { name: 'Ver detalhe de 03/2025' }));

    await waitFor(() => {
      expect(taxReportApi.getMonthlyTaxDetail).toHaveBeenCalledWith({ month: '2025-03' });
      expect(screen.getByText('Detalhe de 03/2025')).toBeTruthy();
      expect(screen.getAllByText('Geral - Comum').length).toBeGreaterThan(0);
      expect(screen.getByText('Geral - Isento')).toBeTruthy();
      expect(screen.getByText('FII')).toBeTruthy();
      expect(screen.getByText('Resultado usa dado manual informado pelo usuario.')).toBeTruthy();
      expect(screen.getByText('PETR4')).toBeTruthy();
      expect(screen.getByText('Custo medio')).toBeTruthy();
      expect(screen.getByText('R$ 24000.00')).toBeTruthy();
      expect(screen.getByText('Valor liquido venda')).toBeTruthy();
      expect(screen.getByText('R$ 24987.66')).toBeTruthy();
      expect(screen.queryByText('IRRF')).toBeNull();
    });
  });

  it('shows blocked reasons and repair CTA labels from the detail payload', async () => {
    const onRepairNavigate = jest.fn();
    taxReportApi.listMonthlyTaxHistory.mockResolvedValue({
      months: [createMonth({ month: '2025-04', state: 'blocked', outcome: 'blocked' })],
    });
    taxReportApi.getMonthlyTaxDetail.mockResolvedValue({
      detail: createDetail({
        summary: {
          ...createDetail().summary,
          month: '2025-04',
          state: 'blocked',
          outcome: 'blocked',
        },
        blockedReasons: [
          {
            code: 'missing_daily_broker_tax',
            message: 'Falta taxa diaria para alocar IRRF.',
            repairTarget: { tab: 'import', hintCode: 'daily_broker_tax' },
            metadata: { date: '2025-04-10', brokerId: 'broker-xp' },
          },
          {
            code: 'unsupported_asset_class',
            message: 'Classificacao do ativo pendente.',
            repairTarget: { tab: 'assets', hintCode: 'asset_type' },
            metadata: { ticker: 'XPTO3' },
          },
          {
            code: 'insufficient_position',
            message: 'Corretora nao encontrada para a venda.',
            repairTarget: { tab: 'brokers', hintCode: 'broker_metadata' },
            metadata: { brokerId: 'broker-new' },
          },
        ],
      }),
    });

    const user = userEvent.setup();
    render(<MonthlyTaxPage onRepairNavigate={onRepairNavigate} />);

    await user.click(await screen.findByRole('button', { name: 'Ver detalhe de 04/2025' }));

    await waitFor(() => {
      expect(screen.getByText('Falta taxa diaria para alocar IRRF.')).toBeTruthy();
      expect(screen.getByText('Classificacao do ativo pendente.')).toBeTruthy();
      expect(screen.getByText('Corretora nao encontrada para a venda.')).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Revisar taxas na importacao' }));
    await user.click(screen.getByRole('button', { name: 'Revisar ativo' }));
    await user.click(screen.getByRole('button', { name: 'Revisar corretora' }));

    expect(onRepairNavigate).toHaveBeenNthCalledWith(1, expect.objectContaining({ tab: 'import' }));
    expect(onRepairNavigate).toHaveBeenNthCalledWith(2, expect.objectContaining({ tab: 'assets' }));
    expect(onRepairNavigate).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ tab: 'brokers' }),
    );
  });

  it('shows the below-threshold carry-forward explanation from detail values', async () => {
    taxReportApi.listMonthlyTaxHistory.mockResolvedValue({
      months: [
        createMonth({
          month: '2025-05',
          state: 'below_threshold',
          outcome: 'below_threshold',
          carryForwardOut: '8.50',
        }),
      ],
    });
    taxReportApi.getMonthlyTaxDetail.mockResolvedValue({
      detail: createDetail({
        summary: {
          ...createDetail().summary,
          month: '2025-05',
          state: 'below_threshold',
          outcome: 'below_threshold',
          netTaxDue: '8.50',
        },
        carryForward: {
          ...createDetail().carryForward,
          closingBelowThresholdTax: '8.50',
        },
      }),
    });

    const user = userEvent.setup();
    render(<MonthlyTaxPage />);

    await user.click(await screen.findByRole('button', { name: 'Ver detalhe de 05/2025' }));

    await waitFor(() => {
      expect(screen.getByText(/R\$ 8.50 abaixo do minimo de recolhimento/)).toBeTruthy();
    });
  });
});
