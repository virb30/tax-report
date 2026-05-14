import type { DailyBrokerTaxRepository } from '../../../ingestion/application/repositories/daily-broker-tax.repository';
import { DailyBrokerTax } from '../../../ingestion/domain/entities/daily-broker-tax.entity';
import type { AssetRepository } from '../../../portfolio/application/repositories/asset.repository';
import type { TransactionRepository } from '../../../portfolio/application/repositories/transaction.repository';
import { Asset } from '../../../portfolio/domain/entities/asset.entity';
import { Transaction } from '../../../portfolio/domain/entities/transaction.entity';
import { Money } from '../../../portfolio/domain/value-objects/money.vo';
import { Quantity } from '../../../portfolio/domain/value-objects/quantity.vo';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import {
  AssetType,
  AssetTypeSource,
  SourceType,
  TransactionType,
} from '../../../shared/types/domain';
import type {
  MonthlyTaxCloseArtifact,
  MonthlyTaxCloseDetail,
  MonthlyTaxCloseRepository,
} from '../repositories/monthly-tax-close.repository';
import { RecalculateMonthlyTaxHistoryUseCase } from './recalculate-monthly-tax-history.use-case';

function createDetail(month: string): MonthlyTaxCloseDetail {
  return {
    summary: {
      month,
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
  };
}

function createPreviousArtifact(month: string): MonthlyTaxCloseArtifact {
  return {
    month,
    state: 'closed',
    outcome: 'no_tax',
    calculationVersion: 'monthly-tax-v1',
    inputFingerprint: 'previous',
    calculatedAt: '2026-05-07T09:00:00.000Z',
    netTaxDue: '0.00',
    carryForwardOut: '0.00',
    changeSummary: null,
    detail: createDetail(month),
  };
}

describe('RecalculateMonthlyTaxHistoryUseCase', () => {
  const brokerId = Uuid.create();
  const transactionRepository = {
    findByPeriod: jest.fn(),
  } as unknown as jest.Mocked<TransactionRepository>;
  const assetRepository = {
    findByTickersList: jest.fn(),
  } as unknown as jest.Mocked<AssetRepository>;
  const dailyBrokerTaxRepository = {
    findByPeriod: jest.fn(),
  } as unknown as jest.Mocked<DailyBrokerTaxRepository>;
  const monthlyTaxCloseRepository = {
    save: jest.fn(),
    findHistory: jest.fn(),
    findDetail: jest.fn(),
    deleteFromYear: jest.fn(),
  } as unknown as jest.Mocked<MonthlyTaxCloseRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deletes and rebuilds months from the earliest affected year forward', async () => {
    const initialBalance = Transaction.restore({
      id: Uuid.create(),
      date: '2025-01-01',
      type: TransactionType.InitialBalance,
      ticker: 'MXRF11',
      quantity: Quantity.from(10),
      unitPrice: Money.from('10'),
      fees: Money.from(0),
      brokerId,
      sourceType: SourceType.Manual,
    });
    const sale = Transaction.restore({
      id: Uuid.create(),
      date: '2026-02-10',
      type: TransactionType.Sell,
      ticker: 'MXRF11',
      quantity: Quantity.from(1),
      unitPrice: Money.from('100'),
      fees: Money.from(0),
      brokerId,
      sourceType: SourceType.Manual,
    });
    const previousArtifact = createPreviousArtifact('2026-02');
    monthlyTaxCloseRepository.findHistory.mockResolvedValue([previousArtifact]);
    monthlyTaxCloseRepository.findDetail.mockResolvedValue(previousArtifact);
    transactionRepository.findByPeriod.mockResolvedValue([initialBalance, sale]);
    assetRepository.findByTickersList.mockResolvedValue([
      Asset.create({
        ticker: 'MXRF11',
        assetType: AssetType.Fii,
        resolutionSource: AssetTypeSource.Manual,
      }),
    ]);
    dailyBrokerTaxRepository.findByPeriod.mockResolvedValue([
      DailyBrokerTax.create({
        date: '2026-02-10',
        brokerId,
        fees: Money.from(0),
        irrf: Money.from(0),
      }),
    ]);
    const useCase = new RecalculateMonthlyTaxHistoryUseCase(
      monthlyTaxCloseRepository,
      transactionRepository,
      assetRepository,
      dailyBrokerTaxRepository,
    );

    const result = await useCase.execute({ startYear: 2025, reason: 'manual' });

    expect(transactionRepository.findByPeriod).toHaveBeenCalledWith({
      startDate: '1900-01-01',
      endDate: '9999-12-31',
    });
    expect(dailyBrokerTaxRepository.findByPeriod).toHaveBeenCalledWith({
      startDate: '1900-01-01',
      endDate: '9999-12-31',
    });
    expect(monthlyTaxCloseRepository.deleteFromYear).toHaveBeenCalledWith(2025);
    expect(monthlyTaxCloseRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        month: '2026-02',
        outcome: 'tax_due',
        netTaxDue: '18.00',
      }),
    );
    expect(result.rebuiltMonths).toEqual(['2025-01', '2026-02']);
    expect(result.changedMonthCount).toBe(2);
  });
});
