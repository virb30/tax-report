import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CapitalGainsPage } from './capital-gains-page';
import {
  CapitalGainsAssessmentStatus,
  CapitalGainsAssetCategory,
  CapitalGainsBlockerCode,
  CapitalGainsTraceClassification,
} from '../../../shared/types/domain';
import type { GenerateCapitalGainsAssessmentResult } from '../../../preload/contracts/tax-reporting/capital-gains-assessment.contract';
import type { ElectronApi } from '../../../preload/renderer/electron-api';

describe('CapitalGainsPage', () => {
  const mockAssessment: GenerateCapitalGainsAssessmentResult = {
    baseYear: 2025,
    generatedAt: '2026-01-01T00:00:00Z',
    annualTotals: {
      saleProceeds: 100000,
      taxableGain: 10000,
      exemptStockGain: 5000,
      loss: 2000,
      compensatedLoss: 1000,
      remainingLossBalance: 1000,
      categories: [
        {
          category: CapitalGainsAssetCategory.Stock,
          saleProceeds: 60000,
          taxableGain: 7000,
          exemptGain: 5000,
          loss: 1000,
          compensatedLoss: 1000,
          remainingLossBalance: 0,
        },
        {
          category: CapitalGainsAssetCategory.Fii,
          saleProceeds: 30000,
          taxableGain: 3000,
          exemptGain: 0,
          loss: 1000,
          compensatedLoss: 0,
          remainingLossBalance: 1000,
        },
        {
          category: CapitalGainsAssetCategory.Etf,
          saleProceeds: 10000,
          taxableGain: 0,
          exemptGain: 0,
          loss: 0,
          compensatedLoss: 0,
          remainingLossBalance: 0,
        },
      ],
    },
    months: [
      {
        month: '2025-01',
        status: CapitalGainsAssessmentStatus.Ready,
        categories: [
          {
            category: CapitalGainsAssetCategory.Stock,
            saleProceeds: 15000,
            taxableGain: 0,
            exemptGain: 2000,
            loss: 0,
            compensatedLoss: 0,
            remainingLossBalance: 0,
          },
          {
            category: CapitalGainsAssetCategory.Fii,
            saleProceeds: 5000,
            taxableGain: 300,
            exemptGain: 0,
            loss: 100,
            compensatedLoss: 0,
            remainingLossBalance: 100,
          },
          {
            category: CapitalGainsAssetCategory.Etf,
            saleProceeds: 0,
            taxableGain: 0,
            exemptGain: 0,
            loss: 0,
            compensatedLoss: 0,
            remainingLossBalance: 0,
          },
        ],
        blockers: [],
        saleTraces: [
          {
            sourceTransactionId: 't1',
            date: '2025-01-10',
            ticker: 'PETR4',
            category: CapitalGainsAssetCategory.Stock,
            saleQuantity: 100,
            saleProceeds: 3000,
            acquisitionCostBasis: 2500,
            feesConsidered: 10,
            averageCostBeforeSale: 25,
            averageCostAfterSale: 25,
            grossResult: 490,
            exemptAmount: 490,
            taxableAmount: 0,
            lossGenerated: 0,
            compensatedLossAmount: 0,
            remainingCategoryLossBalance: 0,
            classification: CapitalGainsTraceClassification.ExemptStockGain,
          },
        ],
      },
      {
        month: '2025-02',
        status: CapitalGainsAssessmentStatus.Pending,
        categories: [
          {
            category: CapitalGainsAssetCategory.Stock,
            saleProceeds: 0,
            taxableGain: 0,
            exemptGain: 0,
            loss: 0,
            compensatedLoss: 0,
            remainingLossBalance: 0,
          },
          {
            category: CapitalGainsAssetCategory.Fii,
            saleProceeds: 0,
            taxableGain: 0,
            exemptGain: 0,
            loss: 0,
            compensatedLoss: 0,
            remainingLossBalance: 0,
          },
          {
            category: CapitalGainsAssetCategory.Etf,
            saleProceeds: 0,
            taxableGain: 0,
            exemptGain: 0,
            loss: 0,
            compensatedLoss: 0,
            remainingLossBalance: 0,
          },
        ],
        blockers: [
          {
            code: CapitalGainsBlockerCode.MissingAssetCategory,
            message: 'Categoria de ativo ausente',
            month: '2025-02',
            ticker: 'UNKNOWN',
            category: null,
            sourceTransactionId: null,
            operationType: null,
          },
        ],
        saleTraces: [],
      },
    ],
    summaryBlockers: [],
  };

  beforeEach(() => {
    window.electronApi = {
      generateCapitalGainsAssessment: jest.fn().mockResolvedValue(mockAssessment),
    } as unknown as ElectronApi;
  });

  it('renders initial state correctly', () => {
    render(<CapitalGainsPage />);
    expect(screen.getByText('Apuração de Ganhos de Capital (Renda Variável)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gerar Apuração' })).toBeTruthy();
  });

  it('generates and displays assessment data', async () => {
    const user = userEvent.setup();
    render(<CapitalGainsPage />);

    await user.click(screen.getByRole('button', { name: 'Gerar Apuração' }));

    await waitFor(() => {
      expect(screen.getByText('Vendas Totais')).toBeTruthy();
      // Use regex to handle potential formatting variations
      expect(screen.getByText(/100\.000,00/)).toBeTruthy();
    });

    expect(screen.getByText('2025-01')).toBeTruthy();
    expect(screen.getByText('Pronto')).toBeTruthy();
    expect(screen.getByText('2025-02')).toBeTruthy();
    expect(screen.getByText('Pendente')).toBeTruthy();
  });

  it('shows consolidated category results for sales, profit, and loss', async () => {
    const user = userEvent.setup();
    render(<CapitalGainsPage />);

    await user.click(screen.getByRole('button', { name: 'Gerar Apuração' }));

    await waitFor(() => {
      expect(screen.getByText('Consolidado por tipo de ativo')).toBeTruthy();
    });

    expect(screen.getAllByText('Ações')).toHaveLength(1);
    expect(screen.getAllByText('FIIs')).toHaveLength(1);
    expect(screen.getAllByText('ETFs')).toHaveLength(1);
    expect(screen.getByText(/60\.000,00/)).toBeTruthy();
    expect(screen.getByText(/13\.000,00/)).toBeTruthy();
    expect(screen.getAllByText(/1\.000,00/).length).toBeGreaterThan(0);
  });

  it('expands month to show blockers and traces', async () => {
    const user = userEvent.setup();
    render(<CapitalGainsPage />);

    await user.click(screen.getByRole('button', { name: 'Gerar Apuração' }));

    await waitFor(() => {
      expect(screen.getByText('2025-01')).toBeTruthy();
    });

    const detailButtons = screen.getAllByRole('button', { name: 'Detalhes' });

    // Expand Jan (Traces)
    await user.click(detailButtons[0]);
    expect(screen.getByText('Resultado mensal por tipo - 2025-01')).toBeTruthy();
    expect(screen.getByText('Trilha de Vendas')).toBeTruthy();
    expect(screen.getByText('PETR4')).toBeTruthy();

    // Expand Feb (Blockers)
    await user.click(detailButtons[1]);
    expect(screen.getByText('Bloqueadores')).toBeTruthy();
    expect(screen.getByText(/Categoria de ativo ausente/)).toBeTruthy();
  });

  it('displays error message on failure', async () => {
    const errorMessage = 'Failed to generate';
    jest
      .mocked(window.electronApi.generateCapitalGainsAssessment)
      .mockRejectedValue(new Error(errorMessage));

    const user = userEvent.setup();
    render(<CapitalGainsPage />);

    await user.click(screen.getByRole('button', { name: 'Gerar Apuração' }));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeTruthy();
    });
  });
});
