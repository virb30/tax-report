import { mock, mockReset } from 'jest-mock-extended';
import {
  AssetType,
  AssetTypeSource,
  PendingIssueCode,
  ReportItemStatus,
  SourceType,
  TransactionType,
} from '../../../../shared/types/domain';
import { Asset } from '../../../domain/portfolio/entities/asset.entity';
import { AssetPosition } from '../../../domain/portfolio/entities/asset-position.entity';
import { Broker } from '../../../domain/portfolio/entities/broker.entity';
import { Transaction } from '../../../domain/portfolio/entities/transaction.entity';
import { Cnpj } from '../../../domain/shared/cnpj.vo';
import { Money } from '../../../domain/portfolio/value-objects/money.vo';
import { Quantity } from '../../../domain/portfolio/value-objects/quantity.vo';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { AssetRepository } from '../../repositories/asset.repository';
import type { BrokerRepository } from '../../repositories/broker.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import { GenerateAssetsReportUseCase } from './generate-assets-report.use-case';

describe('GenerateAssetsReportUseCase', () => {
  const positionRepository = mock<AssetPositionRepository>();
  const brokerRepository = mock<BrokerRepository>();
  const assetRepository = mock<AssetRepository>();
  const transactionRepository = mock<TransactionRepository>();
  let useCase: GenerateAssetsReportUseCase;
  let broker: Broker;

  beforeEach(() => {
    mockReset(positionRepository);
    mockReset(brokerRepository);
    mockReset(assetRepository);
    mockReset(transactionRepository);

    broker = Broker.create({ name: 'XP', cnpj: new Cnpj('02.332.886/0001-04'), code: 'XPT' });
    positionRepository.findAllByYear.mockResolvedValue([]);
    brokerRepository.findAll.mockResolvedValue([broker]);
    assetRepository.findByTickersList.mockResolvedValue([]);
    transactionRepository.findByTicker.mockResolvedValue([]);
    useCase = new GenerateAssetsReportUseCase(
      positionRepository,
      brokerRepository,
      assetRepository,
      transactionRepository,
    );
  });

  it('consolidates a multi-broker holding into one declaration item', async () => {
    const broker2 = Broker.create({
      name: 'Clear',
      cnpj: new Cnpj('02.332.886/0011-78'),
      code: 'CLR1',
    });
    brokerRepository.findAll.mockResolvedValue([broker, broker2]);
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'PETR4',
        year: 2025,
        assetType: AssetType.Stock,
        totalQuantity: Quantity.from(150),
        averagePrice: Money.from(10),
        brokerBreakdown: [
          { brokerId: broker.id, quantity: Quantity.from(100) },
          { brokerId: broker2.id, quantity: Quantity.from(50) },
        ],
      }),
    ]);
    assetRepository.findByTickersList.mockResolvedValue([
      Asset.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.Manual,
        issuerCnpj: new Cnpj('33.000.167/0001-01'),
        name: 'Petrobras',
      }),
    ]);
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2025-01-15',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: Quantity.from(150),
        unitPrice: Money.from(10),
        fees: Money.from(0),
        brokerId: broker.id,
        sourceType: SourceType.Csv,
      }),
    ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      ticker: 'PETR4',
      currentYearValue: 1500,
      previousYearValue: 0,
      status: ReportItemStatus.Required,
      canCopy: true,
    });
    expect(result.items[0]?.brokersSummary).toHaveLength(2);
  });

  it('keeps stock and BDR values below 1000.00 under threshold and requires 1000.00', async () => {
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'ABEV3',
        year: 2025,
        assetType: AssetType.Stock,
        totalQuantity: Quantity.from(1),
        averagePrice: Money.from(999.99),
        brokerBreakdown: [{ brokerId: broker.id, quantity: Quantity.from(1) }],
      }),
      AssetPosition.create({
        ticker: 'BOVA34',
        year: 2025,
        assetType: AssetType.Bdr,
        totalQuantity: Quantity.from(1),
        averagePrice: Money.from(1000),
        brokerBreakdown: [{ brokerId: broker.id, quantity: Quantity.from(1) }],
      }),
    ]);
    assetRepository.findByTickersList.mockResolvedValue([
      Asset.create({
        ticker: 'ABEV3',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.File,
        issuerCnpj: new Cnpj('07.526.557/0001-00'),
        name: 'Ambev',
      }),
      Asset.create({
        ticker: 'BOVA34',
        assetType: AssetType.Bdr,
        resolutionSource: AssetTypeSource.File,
        issuerCnpj: new Cnpj('00.000.000/0001-00'),
        name: 'Bdr',
      }),
    ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items.find((item) => item.ticker === 'ABEV3')?.status).toBe(
      ReportItemStatus.BelowThreshold,
    );
    expect(result.items.find((item) => item.ticker === 'BOVA34')?.status).toBe(
      ReportItemStatus.Required,
    );
  });

  it('keeps FII and ETF values at 140.00 below threshold and requires values above it', async () => {
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'HGLG11',
        year: 2025,
        assetType: AssetType.Fii,
        totalQuantity: Quantity.from(1),
        averagePrice: Money.from(140),
        brokerBreakdown: [{ brokerId: broker.id, quantity: Quantity.from(1) }],
      }),
      AssetPosition.create({
        ticker: 'IVVB11',
        year: 2025,
        assetType: AssetType.Etf,
        totalQuantity: Quantity.from(1),
        averagePrice: Money.from(140.01),
        brokerBreakdown: [{ brokerId: broker.id, quantity: Quantity.from(1) }],
      }),
    ]);
    assetRepository.findByTickersList.mockResolvedValue([
      Asset.create({
        ticker: 'HGLG11',
        assetType: AssetType.Fii,
        resolutionSource: AssetTypeSource.File,
        issuerCnpj: new Cnpj('03.837.735/0001-17'),
        name: 'CSHG',
      }),
      Asset.create({
        ticker: 'IVVB11',
        assetType: AssetType.Etf,
        resolutionSource: AssetTypeSource.File,
        issuerCnpj: new Cnpj('03.203.151/0001-35'),
        name: 'BlackRock',
      }),
    ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items.find((item) => item.ticker === 'HGLG11')?.status).toBe(
      ReportItemStatus.BelowThreshold,
    );
    expect(result.items.find((item) => item.ticker === 'IVVB11')?.status).toBe(
      ReportItemStatus.Required,
    );
  });

  it('surfaces pending metadata and disables copy even when valuations are available', async () => {
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'PETR4',
        year: 2025,
        assetType: AssetType.Stock,
        totalQuantity: Quantity.from(100),
        averagePrice: Money.from(50),
        brokerBreakdown: [{ brokerId: broker.id, quantity: Quantity.from(100) }],
      }),
    ]);
    assetRepository.findByTickersList.mockResolvedValue([
      Asset.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.File,
      }),
    ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items[0]).toMatchObject({
      status: ReportItemStatus.Pending,
      canCopy: false,
      description: null,
    });
    expect(result.items[0]?.pendingIssues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        PendingIssueCode.MissingIssuerName,
        PendingIssueCode.MissingIssuerCnpj,
      ]),
    );
  });

  it('derives previous and current year values from the selected base-year cutoffs', async () => {
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'PETR4',
        year: 2025,
        assetType: AssetType.Stock,
        totalQuantity: Quantity.from(15),
        averagePrice: Money.from(10),
        brokerBreakdown: [{ brokerId: broker.id, quantity: Quantity.from(15) }],
      }),
    ]);
    assetRepository.findByTickersList.mockResolvedValue([
      Asset.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.File,
        issuerCnpj: new Cnpj('33.000.167/0001-01'),
        name: 'Petrobras',
      }),
    ]);
    transactionRepository.findByTicker.mockResolvedValue([
      Transaction.create({
        date: '2024-06-01',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: Quantity.from(10),
        unitPrice: Money.from(10),
        fees: Money.from(0),
        brokerId: broker.id,
        sourceType: SourceType.Csv,
      }),
      Transaction.create({
        date: '2025-02-01',
        type: TransactionType.Buy,
        ticker: 'PETR4',
        quantity: Quantity.from(5),
        unitPrice: Money.from(10),
        fees: Money.from(0),
        brokerId: broker.id,
        sourceType: SourceType.Csv,
      }),
    ]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items[0]).toMatchObject({
      previousYearValue: 100,
      currentYearValue: 150,
      acquiredInYear: false,
    });
  });
});
