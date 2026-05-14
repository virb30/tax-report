import '@testing-library/jest-dom';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AssetType,
  ReportItemStatus,
  TransactionType,
  AssetResolutionStatus,
} from '@/types/api.types';
import type { TaxReportApi } from '@/services/api/tax-report-api';
import type { GenerateAssetsReportResult } from '@/types/api.types';
import type { InitialBalanceDocument, SaveInitialBalanceDocumentResult } from '@/types/api.types';
import type { ListPositionsResult } from '@/types/api.types';
import type { MonthlyTaxCloseDetail, MonthlyTaxCloseSummary } from '@/types/api.types';
import { App } from './App';
import mock, { mockReset } from 'jest-mock-extended/lib/Mock';
import { setTaxReportApiForTesting } from './services/api/tax-report-api-provider';

describe('App critical UI flows (E2E)', () => {
  const taxReportApi = mock<TaxReportApi>();

  function createDocument(overrides: Partial<InitialBalanceDocument> = {}): InitialBalanceDocument {
    return {
      ticker: 'IVVB11',
      year: 2025,
      assetType: AssetType.Etf,
      averagePrice: '300',
      allocations: [
        { brokerId: 'broker-xp', quantity: '2' },
        { brokerId: 'broker-rico', quantity: '1' },
      ],
      totalQuantity: '3',
      ...overrides,
    };
  }

  function createMonthlyDetail(
    overrides: Partial<MonthlyTaxCloseDetail> = {},
  ): MonthlyTaxCloseDetail {
    return {
      summary: {
        month: '2025-04',
        state: 'blocked',
        outcome: 'blocked',
        grossSales: '1000.00',
        realizedResult: '100.00',
        taxBeforeCredits: '15.00',
        irrfCreditUsed: '0.00',
        netTaxDue: '15.00',
      },
      groups: [
        {
          code: 'geral-comum',
          label: 'Geral - Comum',
          grossSales: '1000.00',
          realizedResult: '100.00',
          carriedLossIn: '0.00',
          carriedLossOut: '0.00',
          taxableBase: '100.00',
          taxRate: '15.00',
          taxDue: '15.00',
          irrfCreditUsed: '0.00',
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
      blockedReasons: [
        {
          code: 'unsupported_asset_class',
          message: 'Classificacao do ativo pendente.',
          repairTarget: { tab: 'assets', hintCode: 'asset_type' },
          metadata: { ticker: 'XPTO3' },
        },
      ],
      disclosures: [],
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
      saleLines: [],
      ...overrides,
    };
  }

  beforeEach(() => {
    mockReset(taxReportApi);
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('switches from import to the monthly tax workspace and loads history', async () => {
    const month: MonthlyTaxCloseSummary = {
      month: '2025-04',
      state: 'below_threshold',
      outcome: 'below_threshold',
      calculationVersion: 'v1',
      inputFingerprint: 'fingerprint',
      calculatedAt: '2026-05-07T10:00:00.000Z',
      netTaxDue: '8.50',
      carryForwardOut: '8.50',
      changeSummary: null,
    };

    taxReportApi.listBrokers.mockResolvedValue({ items: [] });
    taxReportApi.listDailyBrokerTaxes.mockResolvedValue({ items: [] });
    taxReportApi.listMonthlyTaxHistory.mockResolvedValue({ months: [month] });

    (taxReportApi as TaxReportApi).appName = 'tax-report';
    setTaxReportApiForTesting(taxReportApi);

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Arquivo selecionado')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Imposto Mensal' }));

    await waitFor(() => {
      expect(taxReportApi.listMonthlyTaxHistory).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Imposto mensal')).toBeInTheDocument();
      expect(screen.getByText('04/2025')).toBeInTheDocument();
      expect(screen.getByText('Abaixo de R$ 10,00')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('Arquivo selecionado')).not.toBeInTheDocument();
  });

  it('routes monthly repair CTAs to existing tabs and refreshes history on return', async () => {
    const blockedMonth: MonthlyTaxCloseSummary = {
      month: '2025-04',
      state: 'blocked',
      outcome: 'blocked',
      calculationVersion: 'v1',
      inputFingerprint: 'fingerprint-a',
      calculatedAt: '2026-05-07T10:00:00.000Z',
      netTaxDue: '0.00',
      carryForwardOut: '0.00',
      changeSummary: null,
    };
    const refreshedMonth: MonthlyTaxCloseSummary = {
      ...blockedMonth,
      state: 'closed',
      outcome: 'tax_due',
      inputFingerprint: 'fingerprint-b',
      netTaxDue: '15.00',
      changeSummary: 'Recalculo alterou o resultado.',
    };

    taxReportApi.listBrokers.mockResolvedValue({ items: [] });
    taxReportApi.listDailyBrokerTaxes.mockResolvedValue({ items: [] });
    taxReportApi.listAssets.mockResolvedValue({ items: [] });
    taxReportApi.listMonthlyTaxHistory
      .mockResolvedValueOnce({ months: [blockedMonth] })
      .mockResolvedValueOnce({ months: [refreshedMonth] });
    taxReportApi.getMonthlyTaxDetail.mockResolvedValue({ detail: createMonthlyDetail() });

    (taxReportApi as TaxReportApi).appName = 'tax-report';
    setTaxReportApiForTesting(taxReportApi);

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Imposto Mensal' }));
    await user.click(await screen.findByRole('button', { name: 'Ver detalhe de 04/2025' }));
    await user.click(await screen.findByRole('button', { name: 'Revisar ativo' }));

    await waitFor(() => {
      expect(screen.getByText('Catalogo de Ativos')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Classificacao do ativo pendente.');
      expect(screen.getByRole('status')).toHaveTextContent('XPTO3');
    });

    await user.click(screen.getByRole('button', { name: 'Imposto Mensal' }));

    await waitFor(() => {
      expect(taxReportApi.listMonthlyTaxHistory).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Fechado')).toBeInTheDocument();
      expect(screen.getByText('R$ 15.00')).toBeInTheDocument();
      expect(screen.getByText('Recalculo alterou o resultado.')).toBeInTheDocument();
    });
  });

  it('requires asset type resolution before confirming an unresolved import preview', async () => {
    const operationsFile = new File(['date,ticker'], 'ops.csv', { type: 'text/csv' });

    taxReportApi.listBrokers.mockResolvedValue({ items: [] });
    taxReportApi.listDailyBrokerTaxes.mockResolvedValue({ items: [] });
    taxReportApi.previewImportTransactions.mockResolvedValue({
      batches: [],
      transactionsPreview: [
        {
          date: '2025-03-10',
          ticker: 'PETR4',
          type: TransactionType.Buy,
          quantity: 10,
          unitPrice: 20,
          fees: 1,
          brokerId: 'broker-xp',
          resolvedAssetType: null,
          resolutionStatus: AssetResolutionStatus.Unresolved,
          needsReview: true,
          unsupportedReason: null,
          sourceAssetType: null,
        },
      ],
      summary: {
        supportedRows: 1,
        pendingRows: 1,
        unsupportedRows: 0,
      },
    });
    taxReportApi.confirmImportTransactions.mockResolvedValue({
      importedCount: 1,
      recalculatedTickers: ['PETR4'],
      skippedUnsupportedRows: 0,
    });

    (taxReportApi as TaxReportApi).appName = 'tax-report';
    setTaxReportApiForTesting(taxReportApi);

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Arquivo selecionado')).toBeInTheDocument();
    });

    await user.upload(screen.getByLabelText('Arquivo selecionado'), operationsFile);
    await user.click(screen.getByRole('button', { name: 'Conferir arquivo' }));

    await waitFor(() => {
      expect(screen.getByText(/Defina o tipo do ativo para confirmar a importação/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Confirmar importação' })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Tipo do ativo para PETR4'), AssetType.Stock);

    expect(screen.getByRole('button', { name: 'Confirmar importação' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Confirmar importação' }));

    await waitFor(() => {
      expect(screen.getByText(/Importação concluída: 1 transações importadas/)).toBeInTheDocument();
    });

    expect(taxReportApi.confirmImportTransactions).toHaveBeenCalledWith({
      file: operationsFile,
      assetTypeOverrides: [{ ticker: 'PETR4', assetType: AssetType.Stock }],
    });
  });

  it('runs import, manual base and annual report flows through UI', async () => {
    const operationsFile = new File(['date,ticker'], 'ops.csv', { type: 'text/csv' });

    taxReportApi.previewImportTransactions.mockResolvedValue({
      batches: [],
      transactionsPreview: [
        {
          date: '2025-03-10',
          ticker: 'PETR4',
          type: TransactionType.Buy,
          quantity: 10,
          unitPrice: 20,
          fees: 1,
          brokerId: 'broker-xp',
          resolvedAssetType: AssetType.Stock,
          resolutionStatus: AssetResolutionStatus.ResolvedFromFile,
          needsReview: false,
          unsupportedReason: null,
          sourceAssetType: AssetType.Stock,
        },
      ],
      summary: {
        supportedRows: 1,
        pendingRows: 0,
        unsupportedRows: 0,
      },
    });

    taxReportApi.confirmImportTransactions.mockResolvedValue({
      importedCount: 1,
      recalculatedTickers: ['PETR4'],
      skippedUnsupportedRows: 0,
    });

    const saveInitialBalanceDocumentResult: SaveInitialBalanceDocumentResult = {
      ok: true,
      data: createDocument(),
    };
    taxReportApi.saveInitialBalanceDocument.mockResolvedValue(saveInitialBalanceDocumentResult);

    const emptyPositionsResult: ListPositionsResult = {
      ok: true,
      data: { items: [] },
    };
    const filledPositionsResult: ListPositionsResult = {
      ok: true,
      data: {
        items: [
          {
            ticker: 'IVVB11',
            assetType: AssetType.Etf,
            totalQuantity: '3',
            averagePrice: '300',
            totalCost: '900',
            brokerBreakdown: [
              {
                brokerId: 'broker-xp',
                brokerName: 'XP',
                brokerCnpj: '00.000.000/0001-00',
                quantity: '2',
              },
              {
                brokerId: 'broker-rico',
                brokerName: 'Rico',
                brokerCnpj: '11.111.111/0001-11',
                quantity: '1',
              },
            ],
          },
        ],
      },
    };
    taxReportApi.listPositions
      .mockResolvedValueOnce(emptyPositionsResult)
      .mockResolvedValueOnce(filledPositionsResult)
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [
            {
              ticker: 'IVVB11',
              assetType: AssetType.Etf,
              totalQuantity: '5',
              averagePrice: '320',
              totalCost: '1600',
              brokerBreakdown: [
                {
                  brokerId: 'broker-xp',
                  brokerName: 'XP',
                  brokerCnpj: '00.000.000/0001-00',
                  quantity: '5',
                },
              ],
            },
          ],
        },
      });

    taxReportApi.listInitialBalanceDocuments
      .mockResolvedValueOnce({ ok: true, data: { items: [] } })
      .mockResolvedValueOnce({ ok: true, data: { items: [createDocument()] } })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [
            createDocument({
              averagePrice: '320',
              allocations: [{ brokerId: 'broker-xp', quantity: '5' }],
              totalQuantity: '5',
            }),
          ],
        },
      });

    const assetsReportResult: GenerateAssetsReportResult = {
      referenceDate: '2025-12-31',
      items: [
        {
          ticker: 'IVVB11',
          assetType: AssetType.Etf,
          totalQuantity: 5,
          averagePrice: 320,
          previousYearValue: 0,
          currentYearValue: 1600,
          acquiredInYear: true,
          revenueClassification: { group: '07', code: '09' },
          status: ReportItemStatus.Required,
          eligibilityReason: 'threshold_met',
          pendingIssues: [],
          canCopy: true,
          description:
            '5 cotas IVVB11. CNPJ: 02.332.886/0001-04. Corretoras: XP Investimentos (CNPJ: 02.332.886/0001-04, 5 cotas). Custo medio: R$ 320,000000. Custo total: R$ 1.600,000000.',
          brokersSummary: [
            {
              brokerId: 'broker-xp',
              brokerName: 'XP Investimentos',
              cnpj: '02.332.886/0001-04',
              quantity: 5,
              totalCost: 1600,
            },
          ],
        },
      ],
    };
    taxReportApi.generateAssetsReport.mockResolvedValue(assetsReportResult);

    taxReportApi.listBrokers.mockResolvedValue({
      items: [
        {
          id: 'broker-xp',
          name: 'XP Investimentos',
          cnpj: '02.332.886/0001-04',
          code: 'XP',
          active: true,
        },
        {
          id: 'broker-rico',
          name: 'Rico',
          cnpj: '11.111.111/0001-11',
          code: 'RICO',
          active: true,
        },
      ],
    });
    taxReportApi.createBroker.mockResolvedValue({
      success: true,
      broker: { id: 'new', name: 'New', cnpj: '00', code: 'NEW', active: true },
    });

    (taxReportApi as TaxReportApi).appName = 'tax-report';
    setTaxReportApiForTesting(taxReportApi);

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });

    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => {
      expect(screen.getByLabelText('Arquivo selecionado')).toBeInTheDocument();
    });

    await user.upload(screen.getByLabelText('Arquivo selecionado'), operationsFile);
    await waitFor(() => {
      expect(screen.getByText('ops.csv')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Conferir arquivo' }));
    await waitFor(() => {
      expect(screen.getByText(/Conferência pronta: 1 transações/)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Confirmar importação' }));
    await waitFor(() => {
      expect(screen.getByText(/Importação concluída/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Saldo Inicial' }));
    await waitFor(() => {
      expect(screen.getByLabelText('Corretora 1')).toHaveValue('broker-xp');
    });
    await user.type(screen.getByLabelText('Ticker'), 'IVVB11');
    await user.clear(screen.getByLabelText('Preço médio global (R$)'));
    await user.type(screen.getByLabelText('Preço médio global (R$)'), '300');
    await user.clear(screen.getByLabelText('Quantidade'));
    await user.type(screen.getByLabelText('Quantidade'), '2');
    await user.click(screen.getByRole('button', { name: 'Adicionar alocação' }));
    await user.selectOptions(screen.getByLabelText('Corretora 2'), 'broker-rico');
    await user.type(screen.getAllByLabelText('Quantidade')[1], '1');
    await user.click(screen.getByRole('button', { name: 'Salvar saldo inicial' }));
    await waitFor(() => {
      expect(screen.getByText('Saldo inicial cadastrado com sucesso.')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/XP Investimentos:\s+2\.00/)).toBeInTheDocument();
      expect(screen.getByText(/Rico:\s+1\.00/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.clear(screen.getByLabelText('Preço médio global (R$)'));
    await user.type(screen.getByLabelText('Preço médio global (R$)'), '320');
    await user.click(screen.getAllByRole('button', { name: 'Remover' })[1]);
    await user.clear(screen.getByLabelText('Quantidade'));
    await user.type(screen.getByLabelText('Quantidade'), '5');
    await user.click(screen.getByRole('button', { name: 'Atualizar saldo inicial' }));

    await waitFor(() => {
      expect(screen.getByText('Saldo inicial atualizado com sucesso.')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/XP Investimentos:\s+5\.00/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Rico:\s+1\.00/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Relatorio Bens e Direitos' }));
    await user.click(screen.getByRole('button', { name: 'Gerar Relatorio' }));
    await waitFor(() => {
      expect(screen.getByText(/Data de referencia: 2025-12-31/)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Copiar Descricao' }));
    await waitFor(() => {
      expect(screen.getByText(/copiado com sucesso/)).toBeInTheDocument();
    });

    expect(taxReportApi.previewImportTransactions).toHaveBeenCalledWith({
      file: operationsFile,
    });
    expect(taxReportApi.confirmImportTransactions).toHaveBeenCalledWith({
      file: operationsFile,
      assetTypeOverrides: [],
    });
    expect(taxReportApi.saveInitialBalanceDocument).toHaveBeenCalledTimes(2);
    expect(taxReportApi.saveInitialBalanceDocument).toHaveBeenLastCalledWith({
      ticker: 'IVVB11',
      year: 2025,
      assetType: AssetType.Etf,
      name: undefined,
      cnpj: undefined,
      averagePrice: '320',
      allocations: [{ brokerId: 'broker-xp', quantity: '5' }],
    });
    expect(taxReportApi.generateAssetsReport).toHaveBeenCalledWith({ baseYear: 2025 });
  });
});
