import { mock, mockReset } from 'jest-mock-extended';
import {
  AssetType,
  CapitalGainsAssessmentStatus,
  CapitalGainsAssetCategory,
  CapitalGainsBlockerCode,
  CapitalGainsTraceClassification,
  SourceType,
  TransactionType,
} from '../../../../../shared/types/domain';
import type {
  CapitalGainsAssessmentFacts,
  CapitalGainsAssessmentQuery,
  CapitalGainsAssessmentTransactionFact,
} from '../../queries/capital-gains-assessment.query';
import {
  CapitalGainsAssessmentService,
  type CapitalGainsSaleAssessment,
} from '../../../domain/capital-gains-assessment.service';
import {
  CapitalGainsLossCompensationService,
  type CapitalGainsMonthlyAssessment,
} from '../../../domain/capital-gains-loss-compensation.service';
import type {
  AssessmentBlockerOutput,
  CapitalGainsAnnualTotals,
  SaleTraceOutput,
} from './generate-capital-gains-assessment.output';
import { GenerateCapitalGainsAssessmentUseCase } from './generate-capital-gains-assessment.use-case';

describe('GenerateCapitalGainsAssessmentUseCase', () => {
  const query = mock<CapitalGainsAssessmentQuery>();
  const assessmentService = mock<CapitalGainsAssessmentService>();
  const lossCompensationService = mock<CapitalGainsLossCompensationService>();
  let useCase: GenerateCapitalGainsAssessmentUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-04T12:00:00.000Z'));
    mockReset(query);
    mockReset(assessmentService);
    mockReset(lossCompensationService);

    query.findSourceFacts.mockResolvedValue(emptyFacts(2025));
    assessmentService.assess.mockReturnValue({ saleTraces: [], blockers: [] });
    lossCompensationService.assess.mockReturnValue(emptyMonthlyAssessment());
    useCase = new GenerateCapitalGainsAssessmentUseCase(
      query,
      assessmentService,
      lossCompensationService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls the query with the requested base year and delegates source facts to services', async () => {
    const sourceFacts = emptyFacts(2026);
    const saleAssessment: CapitalGainsSaleAssessment = {
      saleTraces: [saleTrace()],
      blockers: [blocker()],
    };
    query.findSourceFacts.mockResolvedValue(sourceFacts);
    assessmentService.assess.mockReturnValue(saleAssessment);

    await useCase.execute({ baseYear: 2026 });

    expect(query.findSourceFacts).toHaveBeenCalledWith({ baseYear: 2026 });
    expect(assessmentService.assess).toHaveBeenCalledWith(sourceFacts);
    expect(lossCompensationService.assess).toHaveBeenCalledWith({
      baseYear: 2026,
      saleTraces: saleAssessment.saleTraces,
      blockers: saleAssessment.blockers,
    });
  });

  it('returns base year, generated timestamp, monthly rows, annual totals, and summary blockers', async () => {
    const summaryBlocker = blocker();
    const annualTotals = annualTotalsFixture({ taxableGain: 500 });
    const monthlyAssessment: CapitalGainsMonthlyAssessment = {
      annualTotals,
      months: [
        {
          month: '2025-03',
          status: CapitalGainsAssessmentStatus.Mixed,
          categories: annualTotals.categories,
          blockers: [summaryBlocker],
          saleTraces: [saleTrace()],
        },
      ],
      summaryBlockers: [summaryBlocker],
    };
    lossCompensationService.assess.mockReturnValue(monthlyAssessment);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result).toEqual({
      baseYear: 2025,
      generatedAt: '2026-05-04T12:00:00.000Z',
      annualTotals,
      months: monthlyAssessment.months,
      summaryBlockers: [summaryBlocker],
    });
  });

  it('returns an empty but renderable selected-year assessment with concrete services', async () => {
    const result = await executeWithConcreteServices(emptyFacts(2025));

    expect(result).toEqual({
      baseYear: 2025,
      generatedAt: '2026-05-04T12:00:00.000Z',
      annualTotals: emptyAnnualTotals(),
      months: [],
      summaryBlockers: [],
    });
  });

  it('preserves domain service blockers in summary blockers', async () => {
    const result = await executeWithConcreteServices({
      ...emptyFacts(2025),
      transactions: [
        tx({
          id: 'bdr-sale',
          assetType: AssetType.Bdr,
          category: null,
          transactionType: TransactionType.Sell,
        }),
      ],
    });

    expect(result.summaryBlockers).toEqual([
      expect.objectContaining({
        code: CapitalGainsBlockerCode.UnsupportedAssetType,
        month: '2025-03',
        sourceTransactionId: 'bdr-sale',
      }),
    ]);
    expect(result.months).toEqual([
      expect.objectContaining({
        month: '2025-03',
        status: CapitalGainsAssessmentStatus.Unsupported,
        blockers: result.summaryBlockers,
      }),
    ]);
  });

  it('accepts concrete query output shape and concrete service output without mutating source facts', async () => {
    const sourceFacts: CapitalGainsAssessmentFacts = {
      ...emptyFacts(2025),
      transactions: [
        tx({
          id: 'initial',
          date: '2025-01-01',
          transactionType: TransactionType.InitialBalance,
          quantity: 100,
          unitPrice: 10,
          grossValue: 1000,
        }),
        tx({
          id: 'sale',
          date: '2025-03-10',
          transactionType: TransactionType.Sell,
          quantity: 10,
          unitPrice: 120,
          grossValue: 1200,
        }),
      ],
    };
    const sourceFactsSnapshot: CapitalGainsAssessmentFacts = structuredClone(sourceFacts);

    const result = await executeWithConcreteServices(sourceFacts);

    expect(sourceFacts).toEqual(sourceFactsSnapshot);
    expect(result.months).toEqual([
      expect.objectContaining({
        month: '2025-03',
        status: CapitalGainsAssessmentStatus.Ready,
        saleTraces: [
          expect.objectContaining({
            sourceTransactionId: 'sale',
            classification: CapitalGainsTraceClassification.ExemptStockGain,
            exemptAmount: 1100,
            taxableAmount: 0,
          }),
        ],
      }),
    ]);
    expect(result.annualTotals).toMatchObject({
      saleProceeds: 1200,
      taxableGain: 0,
      exemptStockGain: 1100,
    });
  });

  async function executeWithConcreteServices(sourceFacts: CapitalGainsAssessmentFacts) {
    const concreteQuery = mock<CapitalGainsAssessmentQuery>();
    concreteQuery.findSourceFacts.mockResolvedValue(sourceFacts);
    const concreteUseCase = new GenerateCapitalGainsAssessmentUseCase(
      concreteQuery,
      new CapitalGainsAssessmentService(),
      new CapitalGainsLossCompensationService(),
    );

    return concreteUseCase.execute({ baseYear: sourceFacts.baseYear });
  }
});

function emptyFacts(baseYear: number): CapitalGainsAssessmentFacts {
  return {
    baseYear,
    transactions: [],
    fees: [],
    brokerTaxes: [],
    assets: [],
  };
}

function tx(
  override: Partial<CapitalGainsAssessmentTransactionFact>,
): CapitalGainsAssessmentTransactionFact {
  return {
    id: 'tx',
    date: '2025-03-10',
    ticker: 'PETR4',
    assetType: AssetType.Stock,
    category: CapitalGainsAssetCategory.Stock,
    transactionType: TransactionType.Sell,
    quantity: 10,
    unitPrice: 120,
    grossValue: 1200,
    brokerId: 'broker-1',
    sourceType: SourceType.Csv,
    externalRef: null,
    ...override,
  };
}

function emptyMonthlyAssessment(): CapitalGainsMonthlyAssessment {
  return {
    annualTotals: emptyAnnualTotals(),
    months: [],
    summaryBlockers: [],
  };
}

function emptyAnnualTotals(): CapitalGainsAnnualTotals {
  return annualTotalsFixture({});
}

function annualTotalsFixture(
  override: Partial<Omit<CapitalGainsAnnualTotals, 'categories'>>,
): CapitalGainsAnnualTotals {
  return {
    saleProceeds: override.saleProceeds ?? 0,
    taxableGain: override.taxableGain ?? 0,
    exemptStockGain: override.exemptStockGain ?? 0,
    loss: override.loss ?? 0,
    compensatedLoss: override.compensatedLoss ?? 0,
    remainingLossBalance: override.remainingLossBalance ?? 0,
    categories: [
      CapitalGainsAssetCategory.Stock,
      CapitalGainsAssetCategory.Fii,
      CapitalGainsAssetCategory.Etf,
    ].map((category) => ({
      category,
      saleProceeds: 0,
      taxableGain: 0,
      exemptGain: 0,
      loss: 0,
      compensatedLoss: 0,
      remainingLossBalance: 0,
    })),
  };
}

function blocker(): AssessmentBlockerOutput {
  return {
    code: CapitalGainsBlockerCode.DayTradeUnsupported,
    message: 'Day trade operations are unsupported in V1.',
    month: '2025-03',
    ticker: 'PETR4',
    category: CapitalGainsAssetCategory.Stock,
    sourceTransactionId: 'tx-day-trade',
    operationType: TransactionType.Sell,
  };
}

function saleTrace(): SaleTraceOutput {
  return {
    sourceTransactionId: 'sale',
    date: '2025-03-10',
    ticker: 'PETR4',
    category: CapitalGainsAssetCategory.Stock,
    saleQuantity: 10,
    saleProceeds: 25000,
    acquisitionCostBasis: 20000,
    feesConsidered: 0,
    averageCostBeforeSale: 200,
    averageCostAfterSale: 200,
    grossResult: 5000,
    exemptAmount: 0,
    taxableAmount: 5000,
    lossGenerated: 0,
    compensatedLossAmount: 0,
    remainingCategoryLossBalance: 0,
    classification: CapitalGainsTraceClassification.TaxableGain,
  };
}
