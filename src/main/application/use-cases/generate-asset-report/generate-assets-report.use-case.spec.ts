import { beforeEach, describe, expect, it } from '@jest/globals';
import { AssetType } from '../../../../shared/types/domain';
import type { BrokerRepository } from '../../repositories/broker.repository';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { AssetRepository } from '../../repositories/asset.repository';
import { GenerateAssetsReportUseCase } from './generate-assets-report.use-case';
import { ReportGenerator } from '../../services/report-generator/report-generator.service';
import { mock, mockReset } from 'jest-mock-extended';
import { Cnpj } from '../../../domain/shared/cnpj.vo';
import { Broker } from '../../../domain/portfolio/entities/broker.entity';
import { AssetPosition } from '../../../domain/portfolio/entities/asset-position.entity';
import { Asset } from '../../../domain/portfolio/entities/asset.entity';


describe('GenerateAssetsReportUseCase', () => {
  const positionRepository = mock<AssetPositionRepository>();
  const brokerRepository = mock<BrokerRepository>();
  const assetRepository = mock<AssetRepository>();
  const reportGenerator = new ReportGenerator();
  let useCase: GenerateAssetsReportUseCase;
  let broker: Broker;

  beforeEach(() => {
    mockReset(positionRepository);
    mockReset(brokerRepository);
    mockReset(assetRepository);
    broker = Broker.create({ name: 'TEST', cnpj: new Cnpj('02.332.886/0001-04'), code: 'TST' });
    positionRepository.findAllByYear.mockResolvedValue([]);
    positionRepository.save.mockResolvedValue(undefined);
    brokerRepository.findAll.mockResolvedValue([
      broker,
    ]);
    assetRepository.findByTickersList.mockResolvedValue([]);
    assetRepository.findAll.mockResolvedValue([]);
    assetRepository.save.mockResolvedValue(undefined);
    useCase = new GenerateAssetsReportUseCase(positionRepository, brokerRepository, assetRepository, reportGenerator);
  });

  it('generates annual report with persisted positions', async () => {
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'PETR4',
        year: 2025,
        assetType: AssetType.Stock,
        totalQuantity: 10,
        averagePrice: 20,
        brokerBreakdown: [{ brokerId: broker.id, quantity: 10 }],
      }),
      AssetPosition.create({
        ticker: 'HGLG11',
        year: 2025,
        assetType: AssetType.Fii,
        totalQuantity: 10,
        averagePrice: 150,
        brokerBreakdown: [{ brokerId: broker.id, quantity: 10 }],
      }),
      AssetPosition.create({
        ticker: 'IVVB11',
        year: 2025,
        assetType: AssetType.Etf,
        totalQuantity: 10,
        averagePrice: 300,
        brokerBreakdown: [{ brokerId: broker.id, quantity: 10 }],
      }),
      AssetPosition.create({
        ticker: 'AAPL34',
        year: 2025,
        assetType: AssetType.Stock,
        totalQuantity: 10,
        averagePrice: 40,
        brokerBreakdown: [{ brokerId: broker.id, quantity: 10 }],
      }),
    ]);
    assetRepository.findByTickersList.mockResolvedValue([
      Asset.create({ ticker: 'PETR4', issuerCnpj: new Cnpj('33.000.167/0001-01'), name: 'Petrobras' }),
    ]);
    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.referenceDate).toBe('2025-12-31');
    expect(result.items.length).toBe(4);

    const petr4 = result.items.find((i) => i.ticker === 'PETR4');
    expect(petr4).toBeDefined();
    expect(petr4?.assetType).toBe(AssetType.Stock);
    expect(petr4?.totalQuantity).toBe(10);
    expect(petr4?.averagePrice).toBe(20);
    expect(petr4?.totalCost).toBe(200);
    expect(petr4?.revenueClassification).toEqual({ group: '03', code: '01' });
    expect(petr4?.allocations).toHaveLength(1);
    expect(petr4?.allocations[0]).toMatchObject({
      brokerName: broker.name,
      cnpj: broker.cnpj.value,
      quantity: 10,
      totalCost: 200,
    });
  });


  it('excludes positions zeroed by sells', async () => {
    positionRepository.findAllByYear.mockResolvedValue([AssetPosition.create({
      ticker: 'ABEV3',
      year: 2025,
      assetType: AssetType.Stock,
      totalQuantity: 0,
      averagePrice: 8,
      brokerBreakdown: [],
    })]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items.find((i) => i.ticker === 'ABEV3')).toBeUndefined();
  });

  it('uses existing position for assetType when available', async () => {
    positionRepository.findAllByYear.mockResolvedValue([AssetPosition.create({
      ticker: 'VALE3',
      assetType: AssetType.Stock,
      year: 2025,
      totalQuantity: 1,
      averagePrice: 10,
      brokerBreakdown: [{ brokerId: broker.id, quantity: 1 }],
    })]);

    const result = await useCase.execute({ baseYear: 2025 });

    expect(result.items.find((i) => i.ticker === 'VALE3')?.assetType).toBe(AssetType.Stock);
  });


  it('uses issuer CNPJ from ticker_data when available', async () => {
    positionRepository.findAllByYear.mockResolvedValue([AssetPosition.create({
      ticker: 'PETR4',
      year: 2025,
      assetType: AssetType.Stock,
      totalQuantity: 10,
      averagePrice: 20,
      brokerBreakdown: [{ brokerId: broker.id, quantity: 10 }],
    })]);
    assetRepository.findByTickersList.mockResolvedValue([
      Asset.create({ ticker: 'PETR4', issuerCnpj: new Cnpj('33.000.167/0001-01'), name: 'Petrobras' }),
    ]);

    const result = await useCase.execute({ baseYear: 2025 });

    const petr4 = result.items.find((i) => i.ticker === 'PETR4');
    expect(petr4?.allocations[0]?.description).toContain('CNPJ: 33.000.167/0001-01');
  });

  it('handles multi-broker position with correct allocations', async () => {
    const broker2 = Broker.create({ name: 'TEST2', cnpj: new Cnpj('02.332.886/0001-04'), code: 'TST2' });
    positionRepository.findAllByYear.mockResolvedValue([AssetPosition.create({
      ticker: 'PETR4',
      year: 2025,
      assetType: AssetType.Stock,
      totalQuantity: 150,
      averagePrice: 35.2,
      brokerBreakdown: [{ brokerId: broker.id, quantity: 100 }, { brokerId: broker2.id, quantity: 50 }],
    })]);
    brokerRepository.findAll.mockResolvedValue([
      broker,
      broker2,
    ]);

    const result = await useCase.execute({ baseYear: 2025 });

    const petr4 = result.items.find((i) => i.ticker === 'PETR4');
    expect(petr4?.totalQuantity).toBe(150);
    expect(petr4?.allocations).toHaveLength(2);
    expect(petr4?.allocations.map((a) => a.brokerName)).toEqual(
      expect.arrayContaining(['TEST', 'TEST2']),
    );
  });
});
