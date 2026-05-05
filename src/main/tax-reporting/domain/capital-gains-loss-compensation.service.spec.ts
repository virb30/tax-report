import {
  AssetType,
  CapitalGainsAssessmentStatus,
  CapitalGainsAssetCategory,
  CapitalGainsBlockerCode,
  CapitalGainsTraceClassification,
  SourceType,
  TransactionType,
} from '../../../shared/types/domain';
import type {
  AssessmentBlockerOutput,
  SaleTraceOutput,
} from '../application/use-cases/generate-capital-gains-assessment/generate-capital-gains-assessment.output';
import type {
  CapitalGainsAssessmentFacts,
  CapitalGainsAssessmentTransactionFact,
} from '../application/queries/capital-gains-assessment.query';
import { CapitalGainsAssessmentService } from './capital-gains-assessment.service';
import { CapitalGainsLossCompensationService } from './capital-gains-loss-compensation.service';

describe('CapitalGainsLossCompensationService', () => {
  let service: CapitalGainsLossCompensationService;

  beforeEach(() => {
    service = new CapitalGainsLossCompensationService();
  });

  it('classifies positive stock gains below the ordinary sale threshold as exempt', () => {
    const result = service.assess({
      baseYear: 2025,
      saleTraces: [
        trace({
          id: 'sale',
          date: '2025-01-10',
          saleProceeds: 19_999.99,
          grossResult: 1_500,
        }),
      ],
      blockers: [],
    });

    expect(result.months[0]).toMatchObject({
      month: '2025-01',
      status: CapitalGainsAssessmentStatus.Ready,
    });
    expect(
      findCategory(result.months[0].categories, CapitalGainsAssetCategory.Stock),
    ).toMatchObject({
      saleProceeds: 19_999.99,
      taxableGain: 0,
      exemptGain: 1_500,
    });
    expect(result.months[0].saleTraces[0]).toMatchObject({
      exemptAmount: 1_500,
      taxableAmount: 0,
      classification: CapitalGainsTraceClassification.ExemptStockGain,
    });
  });

  it('classifies positive stock gains equal to the ordinary sale threshold as exempt', () => {
    const result = service.assess({
      baseYear: 2025,
      saleTraces: [
        trace({
          id: 'sale',
          date: '2025-02-10',
          saleProceeds: 20_000,
          grossResult: 2_000,
        }),
      ],
      blockers: [],
    });

    expect(
      findCategory(result.months[0].categories, CapitalGainsAssetCategory.Stock),
    ).toMatchObject({
      taxableGain: 0,
      exemptGain: 2_000,
    });
  });

  it('classifies positive stock gains above the ordinary sale threshold as taxable', () => {
    const result = service.assess({
      baseYear: 2025,
      saleTraces: [
        trace({
          id: 'sale',
          date: '2025-03-10',
          saleProceeds: 20_000.01,
          grossResult: 2_500,
        }),
      ],
      blockers: [],
    });

    expect(
      findCategory(result.months[0].categories, CapitalGainsAssetCategory.Stock),
    ).toMatchObject({
      taxableGain: 2_500,
      exemptGain: 0,
    });
    expect(result.months[0].saleTraces[0]).toMatchObject({
      taxableAmount: 2_500,
      classification: CapitalGainsTraceClassification.TaxableGain,
    });
  });

  it('keeps FII gains taxable when sale proceeds are below the stock threshold', () => {
    const result = service.assess({
      baseYear: 2025,
      saleTraces: [
        trace({
          id: 'fii-sale',
          date: '2025-04-10',
          category: CapitalGainsAssetCategory.Fii,
          ticker: 'KNRI11',
          saleProceeds: 10_000,
          grossResult: 900,
        }),
      ],
      blockers: [],
    });

    expect(findCategory(result.months[0].categories, CapitalGainsAssetCategory.Fii)).toMatchObject({
      taxableGain: 900,
      exemptGain: 0,
    });
  });

  it('keeps ETF gains taxable when sale proceeds are below the stock threshold', () => {
    const result = service.assess({
      baseYear: 2025,
      saleTraces: [
        trace({
          id: 'etf-sale',
          date: '2025-05-10',
          category: CapitalGainsAssetCategory.Etf,
          ticker: 'BOVA11',
          saleProceeds: 10_000,
          grossResult: 800,
        }),
      ],
      blockers: [],
    });

    expect(findCategory(result.months[0].categories, CapitalGainsAssetCategory.Etf)).toMatchObject({
      taxableGain: 800,
      exemptGain: 0,
    });
  });

  it('compensates stock losses against later stock gains but not FII or ETF gains', () => {
    const result = service.assess({
      baseYear: 2025,
      saleTraces: [
        trace({
          id: 'stock-loss',
          date: '2025-01-10',
          saleProceeds: 30_000,
          grossResult: -1_000,
        }),
        trace({
          id: 'fii-gain',
          date: '2025-02-10',
          category: CapitalGainsAssetCategory.Fii,
          ticker: 'KNRI11',
          saleProceeds: 1_000,
          grossResult: 700,
        }),
        trace({
          id: 'etf-gain',
          date: '2025-03-10',
          category: CapitalGainsAssetCategory.Etf,
          ticker: 'BOVA11',
          saleProceeds: 1_000,
          grossResult: 600,
        }),
        trace({
          id: 'stock-gain',
          date: '2025-04-10',
          saleProceeds: 30_000,
          grossResult: 1_200,
        }),
      ],
      blockers: [],
    });

    expect(result.months[1].saleTraces[0]).toMatchObject({
      sourceTransactionId: 'fii-gain',
      compensatedLossAmount: 0,
      taxableAmount: 700,
    });
    expect(result.months[2].saleTraces[0]).toMatchObject({
      sourceTransactionId: 'etf-gain',
      compensatedLossAmount: 0,
      taxableAmount: 600,
    });
    expect(result.months[3].saleTraces[0]).toMatchObject({
      sourceTransactionId: 'stock-gain',
      compensatedLossAmount: 1_000,
      taxableAmount: 200,
      remainingCategoryLossBalance: 0,
      classification: CapitalGainsTraceClassification.CompensatedGain,
    });
  });

  it('compensates FII losses against later FII gains but not stock or ETF gains', () => {
    const result = service.assess({
      baseYear: 2025,
      saleTraces: [
        trace({
          id: 'fii-loss',
          date: '2025-01-10',
          category: CapitalGainsAssetCategory.Fii,
          ticker: 'KNRI11',
          grossResult: -500,
        }),
        trace({
          id: 'stock-gain',
          date: '2025-02-10',
          saleProceeds: 30_000,
          grossResult: 700,
        }),
        trace({
          id: 'etf-gain',
          date: '2025-03-10',
          category: CapitalGainsAssetCategory.Etf,
          ticker: 'BOVA11',
          grossResult: 600,
        }),
        trace({
          id: 'fii-gain',
          date: '2025-04-10',
          category: CapitalGainsAssetCategory.Fii,
          ticker: 'KNRI11',
          grossResult: 900,
        }),
      ],
      blockers: [],
    });

    expect(result.months[1].saleTraces[0]).toMatchObject({
      sourceTransactionId: 'stock-gain',
      compensatedLossAmount: 0,
      taxableAmount: 700,
    });
    expect(result.months[2].saleTraces[0]).toMatchObject({
      sourceTransactionId: 'etf-gain',
      compensatedLossAmount: 0,
      taxableAmount: 600,
    });
    expect(result.months[3].saleTraces[0]).toMatchObject({
      sourceTransactionId: 'fii-gain',
      compensatedLossAmount: 500,
      taxableAmount: 400,
      remainingCategoryLossBalance: 0,
    });
  });

  it('nets same-month gains and losses within the same category regardless of trace order', () => {
    const result = service.assess({
      baseYear: 2025,
      saleTraces: [
        trace({
          id: 'stock-gain',
          date: '2025-05-10',
          saleProceeds: 30_000,
          grossResult: 1_000,
        }),
        trace({
          id: 'stock-loss',
          date: '2025-05-20',
          saleProceeds: 5_000,
          grossResult: -600,
        }),
      ],
      blockers: [],
    });

    expect(
      findCategory(result.months[0].categories, CapitalGainsAssetCategory.Stock),
    ).toMatchObject({
      taxableGain: 400,
      loss: 0,
      remainingLossBalance: 0,
    });
    expect(result.annualTotals).toMatchObject({
      taxableGain: 400,
      loss: 0,
      remainingLossBalance: 0,
    });
  });

  it('does not net same-month losses across different categories', () => {
    const result = service.assess({
      baseYear: 2025,
      saleTraces: [
        trace({
          id: 'stock-gain',
          date: '2025-05-10',
          saleProceeds: 30_000,
          grossResult: 1_000,
        }),
        trace({
          id: 'fii-loss',
          date: '2025-05-20',
          category: CapitalGainsAssetCategory.Fii,
          ticker: 'KNRI11',
          saleProceeds: 5_000,
          grossResult: -600,
        }),
      ],
      blockers: [],
    });

    expect(
      findCategory(result.months[0].categories, CapitalGainsAssetCategory.Stock),
    ).toMatchObject({
      taxableGain: 1_000,
      loss: 0,
      remainingLossBalance: 0,
    });
    expect(findCategory(result.months[0].categories, CapitalGainsAssetCategory.Fii)).toMatchObject(
      {
        taxableGain: 0,
        loss: 600,
        remainingLossBalance: 600,
      },
    );
  });

  it('keeps supported totals and blockers visible in mixed months', () => {
    const blocker = blockerFor({
      id: 'day-trade',
      month: '2025-06',
      code: CapitalGainsBlockerCode.DayTradeUnsupported,
    });
    const result = service.assess({
      baseYear: 2025,
      saleTraces: [
        trace({
          id: 'ready-sale',
          date: '2025-06-10',
          saleProceeds: 30_000,
          grossResult: 1_000,
        }),
      ],
      blockers: [blocker],
    });

    expect(result.months[0]).toMatchObject({
      status: CapitalGainsAssessmentStatus.Mixed,
      blockers: [blocker],
    });
    expect(
      findCategory(result.months[0].categories, CapitalGainsAssetCategory.Stock),
    ).toMatchObject({
      taxableGain: 1_000,
    });
  });

  it('selects pending and unsupported statuses for blocker-only months', () => {
    const result = service.assess({
      baseYear: 2025,
      saleTraces: [],
      blockers: [
        blockerFor({
          id: 'pending',
          month: '2025-07',
          code: CapitalGainsBlockerCode.MissingAssetCategory,
        }),
        blockerFor({
          id: 'unsupported',
          month: '2025-08',
          code: CapitalGainsBlockerCode.UnsupportedAssetType,
        }),
      ],
    });

    expect(result.months).toEqual([
      expect.objectContaining({
        month: '2025-07',
        status: CapitalGainsAssessmentStatus.Pending,
      }),
      expect.objectContaining({
        month: '2025-08',
        status: CapitalGainsAssessmentStatus.Unsupported,
      }),
    ]);
  });

  it('derives annual totals from monthly rows', () => {
    const result = service.assess({
      baseYear: 2025,
      saleTraces: [
        trace({
          id: 'stock-taxable',
          date: '2025-01-10',
          saleProceeds: 30_000,
          grossResult: 2_000,
        }),
        trace({
          id: 'stock-exempt',
          date: '2025-02-10',
          saleProceeds: 10_000,
          grossResult: 1_000,
        }),
        trace({
          id: 'fii-loss',
          date: '2025-03-10',
          category: CapitalGainsAssetCategory.Fii,
          ticker: 'KNRI11',
          saleProceeds: 5_000,
          grossResult: -300,
        }),
      ],
      blockers: [],
    });
    const summedRows = result.months.reduce(
      (sum, month) => ({
        saleProceeds:
          sum.saleProceeds +
          month.categories.reduce(
            (categorySum, category) => categorySum + category.saleProceeds,
            0,
          ),
        taxableGain:
          sum.taxableGain +
          month.categories.reduce((categorySum, category) => categorySum + category.taxableGain, 0),
        exemptGain:
          sum.exemptGain +
          month.categories.reduce((categorySum, category) => categorySum + category.exemptGain, 0),
        loss:
          sum.loss +
          month.categories.reduce((categorySum, category) => categorySum + category.loss, 0),
      }),
      { saleProceeds: 0, taxableGain: 0, exemptGain: 0, loss: 0 },
    );

    expect(result.annualTotals).toMatchObject({
      saleProceeds: summedRows.saleProceeds,
      taxableGain: summedRows.taxableGain,
      exemptStockGain: summedRows.exemptGain,
      loss: summedRows.loss,
    });
  });

  it('classifies task 03 sale traces without losing source trace details', () => {
    const assessmentService = new CapitalGainsAssessmentService();
    const saleAssessment = assessmentService.assess(
      facts([
        tx({
          id: 'initial',
          date: '2025-01-01',
          type: TransactionType.InitialBalance,
          quantity: 100,
          unitPrice: 10,
          grossValue: 1_000,
        }),
        tx({
          id: 'sale',
          date: '2025-09-10',
          type: TransactionType.Sell,
          quantity: 10,
          unitPrice: 12,
          grossValue: 120,
        }),
      ]),
    );

    const result = service.assess({
      baseYear: 2025,
      saleTraces: saleAssessment.saleTraces,
      blockers: saleAssessment.blockers,
    });

    expect(result.months[0].saleTraces[0]).toMatchObject({
      sourceTransactionId: 'sale',
      date: '2025-09-10',
      ticker: 'PETR4',
      saleQuantity: 10,
      saleProceeds: 120,
      acquisitionCostBasis: 100,
      averageCostBeforeSale: 10,
      averageCostAfterSale: 10,
      grossResult: 20,
      classification: CapitalGainsTraceClassification.ExemptStockGain,
    });
  });
});

function findCategory(
  categories: Array<{ category: CapitalGainsAssetCategory }>,
  category: CapitalGainsAssetCategory,
) {
  return categories.find((item) => item.category === category);
}

function trace(input: {
  id: string;
  date: string;
  category?: CapitalGainsAssetCategory;
  ticker?: string;
  saleProceeds?: number;
  grossResult: number;
}): SaleTraceOutput {
  const saleProceeds = input.saleProceeds ?? 1_000;

  return {
    sourceTransactionId: input.id,
    date: input.date,
    ticker: input.ticker ?? 'PETR4',
    category: input.category ?? CapitalGainsAssetCategory.Stock,
    saleQuantity: 10,
    saleProceeds,
    acquisitionCostBasis: saleProceeds - input.grossResult,
    feesConsidered: 0,
    averageCostBeforeSale: 10,
    averageCostAfterSale: 10,
    grossResult: input.grossResult,
    exemptAmount: 0,
    taxableAmount: input.grossResult > 0 ? input.grossResult : 0,
    lossGenerated: input.grossResult < 0 ? Math.abs(input.grossResult) : 0,
    compensatedLossAmount: 0,
    remainingCategoryLossBalance: 0,
    classification:
      input.grossResult < 0
        ? CapitalGainsTraceClassification.Loss
        : CapitalGainsTraceClassification.TaxableGain,
  };
}

function blockerFor(input: {
  id: string;
  month: string;
  code: CapitalGainsBlockerCode;
}): AssessmentBlockerOutput {
  return {
    code: input.code,
    message: 'Blocked transaction.',
    month: input.month,
    ticker: 'PETR4',
    category: CapitalGainsAssetCategory.Stock,
    sourceTransactionId: input.id,
    operationType: TransactionType.Sell,
  };
}

function facts(transactions: CapitalGainsAssessmentTransactionFact[]): CapitalGainsAssessmentFacts {
  return {
    baseYear: 2025,
    transactions,
    fees: [],
    brokerTaxes: [],
    assets: [],
  };
}

function tx(input: {
  id: string;
  date: string;
  type: TransactionType;
  quantity: number;
  unitPrice: number;
  grossValue: number;
}): CapitalGainsAssessmentTransactionFact {
  return {
    id: input.id,
    date: input.date,
    ticker: 'PETR4',
    assetType: AssetType.Stock,
    category: CapitalGainsAssetCategory.Stock,
    transactionType: input.type,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    grossValue: input.grossValue,
    brokerId: 'broker-a',
    sourceType: SourceType.Manual,
    externalRef: input.id,
  };
}
