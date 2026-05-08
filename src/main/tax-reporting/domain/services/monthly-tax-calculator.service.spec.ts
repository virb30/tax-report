import { DailyBrokerTax } from '../../../ingestion/domain/entities/daily-broker-tax.entity';
import { Transaction } from '../../../portfolio/domain/entities/transaction.entity';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';
import { Quantity } from '../../../portfolio/domain/value-objects/quantity.vo';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { SourceType, TransactionType } from '../../../shared/types/domain';
import type {
  MonthlyTaxCloseArtifact,
  MonthlyTaxGroupCode,
} from '../../application/repositories/monthly-tax-close.repository';
import type { MonthlyTaxAssetClassResolution } from './monthly-tax-asset-class-resolver.service';
import { MonthlyTaxCalculatorService } from './monthly-tax-calculator.service';

const brokerId = Uuid.create();

function createTransaction(input: {
  date: string;
  type: TransactionType;
  ticker: string;
  quantity: string;
  unitPrice: string;
  fees?: string;
}): Transaction {
  return Transaction.create({
    date: input.date,
    type: input.type,
    ticker: input.ticker,
    quantity: Quantity.from(input.quantity),
    unitPrice: Money.from(input.unitPrice),
    fees: Money.from(input.fees ?? 0),
    brokerId,
    sourceType: SourceType.Manual,
  });
}

function createDailyTax(date: string, irrf = '0'): DailyBrokerTax {
  return DailyBrokerTax.create({
    date,
    brokerId,
    fees: Money.from(0),
    irrf: Money.from(irrf),
  });
}

function createAssetClass(
  ticker: string,
  assetClass: MonthlyTaxAssetClassResolution['assetClass'],
): MonthlyTaxAssetClassResolution {
  const reason =
    assetClass === 'unsupported'
      ? 'unsupported_asset_type'
      : assetClass === 'unit'
        ? 'stock_unit_ticker'
        : assetClass;

  return {
    ticker,
    assetClass,
    reason,
    isSupported: assetClass !== 'unsupported',
  };
}

function findGroup(artifact: MonthlyTaxCloseArtifact, code: MonthlyTaxGroupCode) {
  return artifact.detail.groups.find((group) => group.code === code);
}

describe('MonthlyTaxCalculatorService', () => {
  const service = new MonthlyTaxCalculatorService();

  it('records stock sales below the exemption cap in Geral - Isento with no tax due', () => {
    const result = service.calculate({
      transactions: [
        createTransaction({
          date: '2026-01-01',
          type: TransactionType.InitialBalance,
          ticker: 'PETR4',
          quantity: '100',
          unitPrice: '100',
        }),
        createTransaction({
          date: '2026-01-10',
          type: TransactionType.Sell,
          ticker: 'PETR4',
          quantity: '100',
          unitPrice: '150',
        }),
      ],
      assetClasses: [createAssetClass('PETR4', 'stock')],
      dailyBrokerTaxes: [createDailyTax('2026-01-10')],
      calculatedAt: '2026-05-07T10:00:00.000Z',
      inputFingerprint: 'fixture',
    });

    const [artifact] = result.artifacts;

    expect(artifact.outcome).toBe('exempt');
    expect(artifact.netTaxDue).toBe('0.00');
    expect(findGroup(artifact, 'geral-isento')).toMatchObject({
      label: 'Geral - Isento',
      grossSales: '15000.00',
      realizedResult: '5000.00',
      taxDue: '0.00',
    });
    expect(findGroup(artifact, 'geral-comum')?.grossSales).toBe('0.00');
  });

  it('taxes FII gains after carrying prior FII losses into the calculation', () => {
    const result = service.calculate({
      transactions: [
        createTransaction({
          date: '2026-01-01',
          type: TransactionType.Buy,
          ticker: 'HGLG11',
          quantity: '10',
          unitPrice: '100',
        }),
        createTransaction({
          date: '2026-01-10',
          type: TransactionType.Sell,
          ticker: 'HGLG11',
          quantity: '10',
          unitPrice: '90',
        }),
        createTransaction({
          date: '2026-02-01',
          type: TransactionType.Buy,
          ticker: 'HGLG11',
          quantity: '10',
          unitPrice: '100',
        }),
        createTransaction({
          date: '2026-02-10',
          type: TransactionType.Sell,
          ticker: 'HGLG11',
          quantity: '10',
          unitPrice: '120',
        }),
      ],
      assetClasses: [createAssetClass('HGLG11', 'fii')],
      dailyBrokerTaxes: [createDailyTax('2026-01-10'), createDailyTax('2026-02-10')],
      calculatedAt: '2026-05-07T10:00:00.000Z',
      inputFingerprint: 'fixture',
    });

    const february = result.artifacts[1];

    expect(february.outcome).toBe('tax_due');
    expect(february.netTaxDue).toBe('20.00');
    expect(findGroup(february, 'fii')).toMatchObject({
      carriedLossIn: '100.00',
      taxableBase: '100.00',
      taxRate: '0.20',
      taxDue: '20.00',
    });
  });

  it('marks final payable tax below BRL 10 as below-threshold and rolls it into the next month', () => {
    const result = service.calculate({
      transactions: [
        createTransaction({
          date: '2026-01-01',
          type: TransactionType.Buy,
          ticker: 'BOVA11',
          quantity: '10',
          unitPrice: '100',
        }),
        createTransaction({
          date: '2026-01-10',
          type: TransactionType.Sell,
          ticker: 'BOVA11',
          quantity: '10',
          unitPrice: '105',
        }),
        createTransaction({
          date: '2026-02-01',
          type: TransactionType.Buy,
          ticker: 'BOVA11',
          quantity: '10',
          unitPrice: '100',
        }),
        createTransaction({
          date: '2026-02-10',
          type: TransactionType.Sell,
          ticker: 'BOVA11',
          quantity: '10',
          unitPrice: '110',
        }),
      ],
      assetClasses: [createAssetClass('BOVA11', 'etf')],
      dailyBrokerTaxes: [createDailyTax('2026-01-10'), createDailyTax('2026-02-10')],
      calculatedAt: '2026-05-07T10:00:00.000Z',
      inputFingerprint: 'fixture',
    });

    expect(result.artifacts[0]).toMatchObject({
      state: 'below_threshold',
      outcome: 'below_threshold',
      netTaxDue: '7.50',
      carryForwardOut: '7.50',
    });
    expect(result.artifacts[1].netTaxDue).toBe('22.50');
    expect(result.artifacts[1].detail.carryForward.openingBelowThresholdTax).toBe('7.50');
  });

  it('blocks same-day opposing trades for the same ticker with a day-trade reason', () => {
    const result = service.calculate({
      transactions: [
        createTransaction({
          date: '2026-01-10',
          type: TransactionType.Buy,
          ticker: 'PETR4',
          quantity: '10',
          unitPrice: '100',
        }),
        createTransaction({
          date: '2026-01-10',
          type: TransactionType.Sell,
          ticker: 'PETR4',
          quantity: '10',
          unitPrice: '110',
        }),
      ],
      assetClasses: [createAssetClass('PETR4', 'stock')],
      dailyBrokerTaxes: [createDailyTax('2026-01-10')],
      calculatedAt: '2026-05-07T10:00:00.000Z',
      inputFingerprint: 'fixture',
    });

    expect(result.artifacts[0]).toMatchObject({
      state: 'blocked',
      outcome: 'blocked',
    });
    expect(result.artifacts[0].detail.blockedReasons).toContainEqual(
      expect.objectContaining({
        code: 'day_trade_not_supported',
      }),
    );
  });

  it('produces a change summary when recomputing a month changes the final outcome', () => {
    const previousArtifact: MonthlyTaxCloseArtifact = {
      month: '2026-01',
      state: 'closed',
      outcome: 'no_tax',
      calculationVersion: 'monthly-tax-v1',
      inputFingerprint: 'old',
      calculatedAt: '2026-05-07T09:00:00.000Z',
      netTaxDue: '0.00',
      carryForwardOut: '0.00',
      changeSummary: null,
      detail: {
        summary: {
          month: '2026-01',
          state: 'closed',
          outcome: 'no_tax',
          grossSales: '0.00',
          realizedResult: '0.00',
          taxBeforeCredits: '0.00',
          irrfCreditUsed: '0.00',
          netTaxDue: '0.00',
        },
        groups: [],
        blockedReasons: [],
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
      },
    };

    const result = service.calculate({
      transactions: [
        createTransaction({
          date: '2026-01-01',
          type: TransactionType.Buy,
          ticker: 'HGLG11',
          quantity: '10',
          unitPrice: '100',
        }),
        createTransaction({
          date: '2026-01-10',
          type: TransactionType.Sell,
          ticker: 'HGLG11',
          quantity: '10',
          unitPrice: '120',
        }),
      ],
      assetClasses: [createAssetClass('HGLG11', 'fii')],
      dailyBrokerTaxes: [createDailyTax('2026-01-10')],
      previousArtifacts: [previousArtifact],
      calculatedAt: '2026-05-07T10:00:00.000Z',
      inputFingerprint: 'fixture',
    });

    expect(result.artifacts[0]).toMatchObject({
      state: 'needs_review',
      outcome: 'tax_due',
      changeSummary: 'Outcome changed from no_tax to tax_due.',
    });
  });

  it('replays months chronologically and propagates losses, IRRF credits, and below-threshold carry-forward', () => {
    const result = service.calculate({
      transactions: [
        createTransaction({
          date: '2026-01-01',
          type: TransactionType.Buy,
          ticker: 'HGLG11',
          quantity: '10',
          unitPrice: '100',
        }),
        createTransaction({
          date: '2026-01-10',
          type: TransactionType.Sell,
          ticker: 'HGLG11',
          quantity: '10',
          unitPrice: '90',
        }),
        createTransaction({
          date: '2026-02-01',
          type: TransactionType.Buy,
          ticker: 'HGLG11',
          quantity: '10',
          unitPrice: '100',
        }),
        createTransaction({
          date: '2026-02-10',
          type: TransactionType.Sell,
          ticker: 'HGLG11',
          quantity: '10',
          unitPrice: '120',
        }),
        createTransaction({
          date: '2026-03-01',
          type: TransactionType.Buy,
          ticker: 'HGLG11',
          quantity: '10',
          unitPrice: '100',
        }),
        createTransaction({
          date: '2026-03-10',
          type: TransactionType.Sell,
          ticker: 'HGLG11',
          quantity: '10',
          unitPrice: '105',
        }),
        createTransaction({
          date: '2026-04-01',
          type: TransactionType.Buy,
          ticker: 'HGLG11',
          quantity: '10',
          unitPrice: '100',
        }),
        createTransaction({
          date: '2026-04-10',
          type: TransactionType.Sell,
          ticker: 'HGLG11',
          quantity: '10',
          unitPrice: '110',
        }),
      ],
      assetClasses: [createAssetClass('HGLG11', 'fii')],
      dailyBrokerTaxes: [
        createDailyTax('2026-01-10'),
        createDailyTax('2026-02-10', '25'),
        createDailyTax('2026-03-10'),
        createDailyTax('2026-04-10'),
      ],
      calculatedAt: '2026-05-07T10:00:00.000Z',
      inputFingerprint: 'fixture',
    });

    const [january, february, march, april] = result.artifacts;

    expect(january.detail.carryForward.closingFiiLoss).toBe('100.00');
    expect(february.detail.carryForward).toMatchObject({
      openingFiiLoss: '100.00',
      closingIrrfCredit: '5.00',
    });
    expect(march).toMatchObject({
      state: 'below_threshold',
      carryForwardOut: '5.00',
    });
    expect(march.detail.carryForward.openingIrrfCredit).toBe('5.00');
    expect(april).toMatchObject({
      outcome: 'tax_due',
      netTaxDue: '25.00',
      carryForwardOut: '0.00',
    });
    expect(april.detail.carryForward.openingBelowThresholdTax).toBe('5.00');
  });
});
