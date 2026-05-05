import {
  AssetType,
  CapitalGainsAssetCategory,
  CapitalGainsBlockerCode,
  CapitalGainsTraceClassification,
  SourceType,
  TransactionType,
} from '../../../shared/types/domain';
import type {
  CapitalGainsAssessmentFacts,
  CapitalGainsAssessmentTransactionFact,
} from '../application/queries/capital-gains-assessment.query';
import { CapitalGainsAssessmentService } from './capital-gains-assessment.service';

describe('CapitalGainsAssessmentService', () => {
  let service: CapitalGainsAssessmentService;

  beforeEach(() => {
    service = new CapitalGainsAssessmentService();
  });

  it('uses an initial balance as acquisition cost basis for a later sale', () => {
    const result = service.assess(
      facts([
        tx({
          id: 'initial',
          date: '2025-01-01',
          type: TransactionType.InitialBalance,
          quantity: 100,
          unitPrice: 10,
          grossValue: 1000,
        }),
        tx({
          id: 'sale',
          date: '2025-02-10',
          type: TransactionType.Sell,
          quantity: 40,
          unitPrice: 12,
          grossValue: 480,
        }),
      ]),
    );

    expect(result.blockers).toEqual([]);
    expect(result.saleTraces).toEqual([
      expect.objectContaining({
        sourceTransactionId: 'sale',
        saleQuantity: 40,
        saleProceeds: 480,
        acquisitionCostBasis: 400,
        averageCostBeforeSale: 10,
        averageCostAfterSale: 10,
        grossResult: 80,
        taxableAmount: 80,
        classification: CapitalGainsTraceClassification.TaxableGain,
      }),
    ]);
  });

  it('updates average cost with buy fees before a later sale', () => {
    const result = service.assess({
      ...facts([
        tx({
          id: 'initial',
          date: '2025-01-01',
          type: TransactionType.InitialBalance,
          quantity: 100,
          unitPrice: 10,
          grossValue: 1000,
        }),
        tx({
          id: 'buy',
          date: '2025-01-15',
          type: TransactionType.Buy,
          quantity: 100,
          unitPrice: 20,
          grossValue: 2000,
        }),
        tx({
          id: 'sale',
          date: '2025-03-10',
          type: TransactionType.Sell,
          quantity: 50,
          unitPrice: 25,
          grossValue: 1250,
        }),
      ]),
      fees: [{ id: 'fee-buy', transactionId: 'buy', amount: 20 }],
    });

    expect(result.saleTraces).toEqual([
      expect.objectContaining({
        acquisitionCostBasis: 755,
        averageCostBeforeSale: 15.1,
        grossResult: 495,
      }),
    ]);
  });

  it('assesses assets bought and fully sold within the base year', () => {
    const result = service.assess(
      facts([
        tx({
          id: 'buy',
          date: '2025-01-15',
          type: TransactionType.Buy,
          quantity: 100,
          unitPrice: 10,
          grossValue: 1000,
        }),
        tx({
          id: 'sale',
          date: '2025-03-10',
          type: TransactionType.Sell,
          quantity: 100,
          unitPrice: 12,
          grossValue: 1200,
        }),
      ]),
    );

    expect(result.blockers).toEqual([]);
    expect(result.saleTraces).toEqual([
      expect.objectContaining({
        sourceTransactionId: 'sale',
        saleQuantity: 100,
        saleProceeds: 1200,
        acquisitionCostBasis: 1000,
        averageCostBeforeSale: 10,
        averageCostAfterSale: 0,
        grossResult: 200,
      }),
    ]);
  });

  it('uses pre-base-year history for cost basis without emitting prior-year sale traces', () => {
    const result = service.assess(
      facts([
        tx({
          id: 'historical-buy',
          date: '2024-11-15',
          type: TransactionType.Buy,
          quantity: 100,
          unitPrice: 10,
          grossValue: 1000,
        }),
        tx({
          id: 'historical-sale',
          date: '2024-12-10',
          type: TransactionType.Sell,
          quantity: 20,
          unitPrice: 11,
          grossValue: 220,
        }),
        tx({
          id: 'sale',
          date: '2025-03-10',
          type: TransactionType.Sell,
          quantity: 30,
          unitPrice: 12,
          grossValue: 360,
        }),
      ]),
    );

    expect(result.blockers).toEqual([]);
    expect(result.saleTraces).toEqual([
      expect.objectContaining({
        sourceTransactionId: 'sale',
        saleQuantity: 30,
        saleProceeds: 360,
        acquisitionCostBasis: 300,
        averageCostBeforeSale: 10,
        grossResult: 60,
      }),
    ]);
  });

  it('calculates sale profit from net sale proceeds while keeping gross sale proceeds traceable', () => {
    const result = service.assess({
      ...facts([
        tx({
          id: 'initial',
          date: '2025-01-01',
          type: TransactionType.InitialBalance,
          quantity: 100,
          unitPrice: 10,
          grossValue: 1000,
        }),
        tx({
          id: 'sale',
          date: '2025-04-10',
          type: TransactionType.Sell,
          quantity: 25,
          unitPrice: 11,
          grossValue: 275,
        }),
      ]),
      fees: [{ id: 'fee-sale', transactionId: 'sale', amount: 5 }],
    });

    expect(result.saleTraces[0]).toMatchObject({
      sourceTransactionId: 'sale',
      feesConsidered: 5,
      saleProceeds: 275,
      acquisitionCostBasis: 250,
      grossResult: 20,
      averageCostAfterSale: 10,
    });
  });

  it('applies bonus quantity and unit cost before assessing a sale', () => {
    const result = service.assess(
      facts([
        tx({
          id: 'initial',
          date: '2025-01-01',
          type: TransactionType.InitialBalance,
          quantity: 100,
          unitPrice: 10,
          grossValue: 1000,
        }),
        tx({
          id: 'bonus',
          date: '2025-02-01',
          type: TransactionType.Bonus,
          quantity: 20,
          unitPrice: 0,
          grossValue: 0,
        }),
        tx({
          id: 'sale',
          date: '2025-05-10',
          type: TransactionType.Sell,
          quantity: 60,
          unitPrice: 12,
          grossValue: 720,
        }),
      ]),
    );

    expect(result.saleTraces[0]).toMatchObject({
      acquisitionCostBasis: 500,
      averageCostBeforeSale: 8.33,
      grossResult: 220,
    });
  });

  it('applies split and reverse split without changing total cost', () => {
    const result = service.assess(
      facts([
        tx({
          id: 'initial',
          date: '2025-01-01',
          type: TransactionType.InitialBalance,
          quantity: 100,
          unitPrice: 10,
          grossValue: 1000,
        }),
        tx({
          id: 'split',
          date: '2025-02-01',
          type: TransactionType.Split,
          quantity: 2,
        }),
        tx({
          id: 'reverse-split',
          date: '2025-03-01',
          type: TransactionType.ReverseSplit,
          quantity: 4,
        }),
        tx({
          id: 'sale',
          date: '2025-06-10',
          type: TransactionType.Sell,
          quantity: 10,
          unitPrice: 30,
          grossValue: 300,
        }),
      ]),
    );

    expect(result.saleTraces[0]).toMatchObject({
      acquisitionCostBasis: 200,
      averageCostBeforeSale: 20,
      grossResult: 100,
    });
  });

  it('preserves transfer cost basis when source cost data is available', () => {
    const result = service.assess(
      facts([
        tx({
          id: 'transfer-in',
          date: '2025-01-10',
          type: TransactionType.TransferIn,
          quantity: 100,
          unitPrice: 18,
          grossValue: 1800,
        }),
        tx({
          id: 'transfer-out',
          date: '2025-02-10',
          type: TransactionType.TransferOut,
          quantity: 40,
        }),
        tx({
          id: 'sale',
          date: '2025-07-10',
          type: TransactionType.Sell,
          quantity: 20,
          unitPrice: 20,
          grossValue: 400,
        }),
      ]),
    );

    expect(result.blockers).toEqual([]);
    expect(result.saleTraces[0]).toMatchObject({
      acquisitionCostBasis: 360,
      averageCostBeforeSale: 18,
      grossResult: 40,
    });
  });

  it('blocks transfer-in when no source cost basis is available', () => {
    const result = service.assess(
      facts([
        tx({
          id: 'transfer-in',
          date: '2025-01-10',
          type: TransactionType.TransferIn,
          quantity: 100,
          unitPrice: 0,
          grossValue: 0,
        }),
      ]),
    );

    expect(result.saleTraces).toEqual([]);
    expect(result.blockers).toEqual([
      expect.objectContaining({
        code: CapitalGainsBlockerCode.MissingCostBasis,
        sourceTransactionId: 'transfer-in',
      }),
    ]);
  });

  it('assesses fraction auction as a sale-like transaction', () => {
    const result = service.assess(
      facts([
        tx({
          id: 'initial',
          date: '2025-01-01',
          type: TransactionType.InitialBalance,
          quantity: 10.5,
          unitPrice: 20,
          grossValue: 210,
        }),
        tx({
          id: 'fraction-auction',
          date: '2025-08-15',
          type: TransactionType.FractionAuction,
          quantity: 0.5,
          unitPrice: 22,
          grossValue: 11,
        }),
      ]),
    );

    expect(result.blockers).toEqual([]);
    expect(result.saleTraces).toEqual([
      expect.objectContaining({
        sourceTransactionId: 'fraction-auction',
        saleQuantity: 0.5,
        saleProceeds: 11,
        acquisitionCostBasis: 10,
        averageCostBeforeSale: 20,
        averageCostAfterSale: 20,
        grossResult: 1,
      }),
    ]);
  });

  it('emits day trade blockers and does not calculate same-day ordinary results as ready', () => {
    const result = service.assess(
      facts([
        tx({
          id: 'initial',
          date: '2025-01-01',
          type: TransactionType.InitialBalance,
          quantity: 100,
          unitPrice: 10,
          grossValue: 1000,
        }),
        tx({
          id: 'day-buy',
          date: '2025-09-10',
          type: TransactionType.Buy,
          quantity: 10,
          unitPrice: 9,
          grossValue: 90,
        }),
        tx({
          id: 'day-sell',
          date: '2025-09-10',
          type: TransactionType.Sell,
          quantity: 10,
          unitPrice: 11,
          grossValue: 110,
        }),
      ]),
    );

    expect(result.saleTraces).toEqual([]);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: CapitalGainsBlockerCode.DayTradeUnsupported,
          sourceTransactionId: 'day-buy',
        }),
        expect.objectContaining({
          code: CapitalGainsBlockerCode.DayTradeUnsupported,
          sourceTransactionId: 'day-sell',
        }),
      ]),
    );
  });

  it('emits a pending blocker when asset type is missing', () => {
    const result = service.assess(
      facts([
        tx({
          id: 'missing-asset',
          date: '2025-10-10',
          type: TransactionType.Sell,
          assetType: null,
          category: null,
        }),
      ]),
    );

    expect(result.saleTraces).toEqual([]);
    expect(result.blockers).toEqual([
      expect.objectContaining({
        code: CapitalGainsBlockerCode.MissingAssetCategory,
        sourceTransactionId: 'missing-asset',
      }),
    ]);
  });

  it('emits an unsupported blocker for unsupported asset types', () => {
    const result = service.assess(
      facts([
        tx({
          id: 'bdr-sale',
          date: '2025-10-10',
          type: TransactionType.Sell,
          assetType: AssetType.Bdr,
          category: null,
        }),
      ]),
    );

    expect(result.saleTraces).toEqual([]);
    expect(result.blockers).toEqual([
      expect.objectContaining({
        code: CapitalGainsBlockerCode.UnsupportedAssetType,
        sourceTransactionId: 'bdr-sale',
      }),
    ]);
  });

  it('blocks sales that exceed the available cost-basis quantity', () => {
    const result = service.assess(
      facts([
        tx({
          id: 'initial',
          date: '2025-01-01',
          type: TransactionType.InitialBalance,
          quantity: 10,
          unitPrice: 10,
          grossValue: 100,
        }),
        tx({
          id: 'sale',
          date: '2025-11-10',
          type: TransactionType.Sell,
          quantity: 11,
          unitPrice: 12,
          grossValue: 132,
        }),
      ]),
    );

    expect(result.saleTraces).toEqual([]);
    expect(result.blockers).toEqual([
      expect.objectContaining({
        code: CapitalGainsBlockerCode.AmbiguousCostBasis,
        sourceTransactionId: 'sale',
      }),
    ]);
  });

  it('consumes capital gains source fact DTOs without adapter-specific fields', () => {
    const sourceFacts: CapitalGainsAssessmentFacts = {
      baseYear: 2025,
      transactions: [
        tx({
          id: 'initial',
          date: '2025-01-01',
          type: TransactionType.InitialBalance,
          quantity: 100,
          unitPrice: 30,
          grossValue: 3000,
          ticker: 'BOVA11',
          assetType: AssetType.Etf,
          category: CapitalGainsAssetCategory.Etf,
        }),
        tx({
          id: 'sale',
          date: '2025-12-10',
          type: TransactionType.Sell,
          quantity: 10,
          unitPrice: 35,
          grossValue: 350,
          ticker: 'BOVA11',
          assetType: AssetType.Etf,
          category: CapitalGainsAssetCategory.Etf,
        }),
      ],
      fees: [],
      brokerTaxes: [],
      assets: [
        {
          ticker: 'BOVA11',
          assetType: AssetType.Etf,
          category: CapitalGainsAssetCategory.Etf,
          name: 'BOVA11',
          cnpj: null,
        },
      ],
    };

    const result = service.assess(sourceFacts);

    expect(result.saleTraces).toEqual([
      expect.objectContaining({
        sourceTransactionId: 'sale',
        category: CapitalGainsAssetCategory.Etf,
        acquisitionCostBasis: 300,
        grossResult: 50,
      }),
    ]);
  });
  it('accumulates position on multiple initial balances for the same date (e.g. multiple brokers)', () => {
    const result = service.assess(
      facts([
        tx({
          id: 'initial-1',
          date: '2025-01-01',
          type: TransactionType.InitialBalance,
          quantity: 100,
          unitPrice: 10,
        }),
        tx({
          id: 'initial-2',
          date: '2025-01-01',
          type: TransactionType.InitialBalance,
          quantity: 50,
          unitPrice: 20,
        }),
        tx({
          id: 'sale',
          date: '2025-03-10',
          type: TransactionType.Sell,
          quantity: 150,
          unitPrice: 25,
          grossValue: 3750,
        }),
      ]),
    );

    expect(result.saleTraces).toEqual([
      expect.objectContaining({
        averageCostBeforeSale: 13.33,
        acquisitionCostBasis: 2000,
        grossResult: 1750,
      }),
    ]);
  });
});

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
  ticker?: string;
  assetType?: AssetType | null;
  category?: CapitalGainsAssetCategory | null;
  quantity?: number;
  unitPrice?: number;
  grossValue?: number;
}): CapitalGainsAssessmentTransactionFact {
  return {
    id: input.id,
    date: input.date,
    ticker: input.ticker ?? 'PETR4',
    assetType: input.assetType === undefined ? AssetType.Stock : input.assetType,
    category: input.category === undefined ? CapitalGainsAssetCategory.Stock : input.category,
    transactionType: input.type,
    quantity: input.quantity ?? 10,
    unitPrice: input.unitPrice ?? 10,
    grossValue: input.grossValue ?? (input.quantity ?? 10) * (input.unitPrice ?? 10),
    brokerId: 'broker-a',
    sourceType: SourceType.Manual,
    externalRef: input.id,
  };
}
