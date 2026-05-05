import {
  CapitalGainsAssessmentStatus,
  CapitalGainsAssetCategory,
  CapitalGainsBlockerCode,
  CapitalGainsTraceClassification,
  TransactionType,
} from '../../../../../shared/types/domain';
import type { GenerateCapitalGainsAssessmentResult } from '../../../../../preload/contracts/tax-reporting/capital-gains-assessment.contract';
import type { GenerateCapitalGainsAssessmentOutput } from './generate-capital-gains-assessment.output';

describe('GenerateCapitalGainsAssessment DTOs', () => {
  it('exports all capital gains assessment month statuses', () => {
    expect(Object.values(CapitalGainsAssessmentStatus)).toEqual(
      expect.arrayContaining(['ready', 'pending', 'unsupported', 'mixed']),
    );
  });

  it('exports the supported capital gains asset categories', () => {
    expect(Object.values(CapitalGainsAssetCategory)).toEqual(
      expect.arrayContaining(['stock', 'fii', 'etf']),
    );
  });

  it('represents annual totals, blockers, and sale traces in monthly output', () => {
    const output: GenerateCapitalGainsAssessmentOutput = {
      baseYear: 2025,
      generatedAt: '2026-05-04T12:00:00.000Z',
      annualTotals: {
        saleProceeds: 21000,
        taxableGain: 500,
        exemptStockGain: 150,
        loss: 100,
        compensatedLoss: 75,
        remainingLossBalance: 25,
        categories: [
          {
            category: CapitalGainsAssetCategory.Stock,
            saleProceeds: 21000,
            taxableGain: 500,
            exemptGain: 150,
            loss: 100,
            compensatedLoss: 75,
            remainingLossBalance: 25,
          },
        ],
      },
      months: [
        {
          month: '2025-03',
          status: CapitalGainsAssessmentStatus.Mixed,
          categories: [
            {
              category: CapitalGainsAssetCategory.Stock,
              saleProceeds: 21000,
              taxableGain: 500,
              exemptGain: 150,
              loss: 100,
              compensatedLoss: 75,
              remainingLossBalance: 25,
            },
          ],
          blockers: [
            {
              code: CapitalGainsBlockerCode.DayTradeUnsupported,
              message: 'Day trade operations are unsupported in V1.',
              month: '2025-03',
              ticker: 'PETR4',
              category: CapitalGainsAssetCategory.Stock,
              sourceTransactionId: 'tx-day-trade',
              operationType: TransactionType.Sell,
            },
          ],
          saleTraces: [
            {
              sourceTransactionId: 'tx-sale',
              date: '2025-03-10',
              ticker: 'PETR4',
              category: CapitalGainsAssetCategory.Stock,
              saleQuantity: 100,
              saleProceeds: 21000,
              acquisitionCostBasis: 20000,
              feesConsidered: 25,
              averageCostBeforeSale: 200,
              averageCostAfterSale: 200,
              grossResult: 975,
              exemptAmount: 0,
              taxableAmount: 500,
              lossGenerated: 0,
              compensatedLossAmount: 475,
              remainingCategoryLossBalance: 25,
              classification: CapitalGainsTraceClassification.CompensatedGain,
            },
          ],
        },
      ],
      summaryBlockers: [],
    };
    const preloadResult: GenerateCapitalGainsAssessmentResult = output;

    expect(preloadResult.months[0]).toMatchObject({
      status: CapitalGainsAssessmentStatus.Mixed,
      blockers: [{ code: CapitalGainsBlockerCode.DayTradeUnsupported }],
      saleTraces: [{ classification: CapitalGainsTraceClassification.CompensatedGain }],
    });
  });
});
