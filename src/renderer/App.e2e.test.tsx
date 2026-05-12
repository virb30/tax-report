import '@testing-library/jest-dom';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetType, ReportItemStatus, TransactionType, AssetResolutionStatus } from '../ipc/public';
import type { ElectronApi } from '../ipc/public';
import type { GenerateAssetsReportResult } from '../ipc/public';
import type { InitialBalanceDocument, SaveInitialBalanceDocumentResult } from '../ipc/public';
import type { ListPositionsResult } from '../ipc/public';
import type { MonthlyTaxCloseDetail, MonthlyTaxCloseSummary } from '../ipc/public';
import { App } from './App';
import mock, { mockReset } from 'jest-mock-extended/lib/Mock';

describe('App critical UI flows (E2E)', () => {
  const electronApi = mock<ElectronApi>();

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
    mockReset(electronApi);
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

    electronApi.listBrokers.mockResolvedValue({ items: [] });
    electronApi.listDailyBrokerTaxes.mockResolvedValue({ items: [] });
    electronApi.listMonthlyTaxHistory.mockResolvedValue({ months: [month] });

    (electronApi as ElectronApi).appName = 'tax-report';
    window.electronApi = electronApi;

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Selecionar' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Imposto Mensal' }));

    await waitFor(() => {
      expect(electronApi.listMonthlyTaxHistory).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Imposto mensal')).toBeInTheDocument();
      expect(screen.getByText('04/2025')).toBeInTheDocument();
      expect(screen.getByText('Abaixo de R$ 10,00')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Selecionar' })).not.toBeInTheDocument();
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

    electronApi.listBrokers.mockResolvedValue({ items: [] });
    electronApi.listDailyBrokerTaxes.mockResolvedValue({ items: [] });
    electronApi.listAssets.mockResolvedValue({ items: [] });
    electronApi.listMonthlyTaxHistory
      .mockResolvedValueOnce({ months: [blockedMonth] })
      .mockResolvedValueOnce({ months: [refreshedMonth] });
    electronApi.getMonthlyTaxDetail.mockResolvedValue({ detail: createMonthlyDetail() });

    (electronApi as ElectronApi).appName = 'tax-report';
    window.electronApi = electronApi;

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
      expect(electronApi.listMonthlyTaxHistory).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Fechado')).toBeInTheDocument();
      expect(screen.getByText('R$ 15.00')).toBeInTheDocument();
      expect(screen.getByText('Recalculo alterou o resultado.')).toBeInTheDocument();
    });
  });

  it('runs import, manual base and annual report flows through UI', async () => {
    electronApi.importSelectFile.mockResolvedValue({ filePath: '/tmp/ops.csv' });

    electronApi.previewImportTransactions.mockResolvedValue({
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

    electronApi.confirmImportTransactions.mockResolvedValue({
      importedCount: 1,
      recalculatedTickers: ['PETR4'],
      skippedUnsupportedRows: 0,
    });

    const saveInitialBalanceDocumentResult: SaveInitialBalanceDocumentResult = {
      ok: true,
      data: createDocument(),
    };
    electronApi.saveInitialBalanceDocument.mockResolvedValue(saveInitialBalanceDocumentResult);

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
    electronApi.listPositions
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

    electronApi.listInitialBalanceDocuments
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
    electronApi.generateAssetsReport.mockResolvedValue(assetsReportResult);

    electronApi.listBrokers.mockResolvedValue({
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
    electronApi.createBroker.mockResolvedValue({
      success: true,
      broker: { id: 'new', name: 'New', cnpj: '00', code: 'NEW', active: true },
    });

    (electronApi as ElectronApi).appName = 'tax-report';
    window.electronApi = electronApi;

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });

    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Selecionar' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Selecionar' }));
    await waitFor(() => {
      expect(screen.getByDisplayValue('/tmp/ops.csv')).toBeInTheDocument();
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

    expect(electronApi.importSelectFile).toHaveBeenCalledTimes(1);
    expect(electronApi.previewImportTransactions).toHaveBeenCalledWith({
      filePath: '/tmp/ops.csv',
    });
    expect(electronApi.confirmImportTransactions).toHaveBeenCalledWith({
      filePath: '/tmp/ops.csv',
      assetTypeOverrides: [],
    });
    expect(electronApi.saveInitialBalanceDocument).toHaveBeenCalledTimes(2);
    expect(electronApi.saveInitialBalanceDocument).toHaveBeenLastCalledWith({
      ticker: 'IVVB11',
      year: 2025,
      assetType: AssetType.Etf,
      name: undefined,
      cnpj: undefined,
      averagePrice: '320',
      allocations: [{ brokerId: 'broker-xp', quantity: '5' }],
    });
    expect(electronApi.generateAssetsReport).toHaveBeenCalledWith({ baseYear: 2025 });
  });
});
