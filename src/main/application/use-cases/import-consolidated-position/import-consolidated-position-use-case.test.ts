import { mock } from 'jest-mock-extended';
import { ImportConsolidatedPositionUseCase } from './import-consolidated-position-use-case';
import type { ConsolidatedPositionParserPort } from '../../interfaces/consolidated-position-parser.port';
import type { AssetRepository } from '../../repositories/asset.repository';
import type { BrokerRepository } from '../../repositories/broker.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import type { Queue } from '../../events/queue.interface';
import { Broker } from '../../../domain/portfolio/entities/broker.entity';
import { Cnpj } from '../../../domain/shared/cnpj.vo';
import { ConsolidatedPositionImportedEvent } from '../../../domain/events/consolidated-position-imported.event';
import { Asset } from '../../../domain/portfolio/entities/asset.entity';
import {
  AssetType,
  AssetTypeSource,
  UnsupportedImportReason,
} from '../../../../shared/types/domain';

describe('ImportConsolidatedPositionUseCase', () => {
  let parser: jest.Mocked<ConsolidatedPositionParserPort>;
  let assetRepo: jest.Mocked<AssetRepository>;
  let brokerRepo: jest.Mocked<BrokerRepository>;
  let transactionRepo: jest.Mocked<TransactionRepository>;
  let queue: jest.Mocked<Queue>;
  let useCase: ImportConsolidatedPositionUseCase;
  let xpBroker: Broker;
  let clearBroker: Broker;

  beforeEach(() => {
    parser = mock<ConsolidatedPositionParserPort>();
    assetRepo = mock<AssetRepository>();
    brokerRepo = mock<BrokerRepository>();
    transactionRepo = mock<TransactionRepository>();
    queue = mock<Queue>();

    xpBroker = Broker.create({
      name: 'XP',
      cnpj: new Cnpj('00.000.000/0001-00'),
      code: 'XP',
      active: true,
    });
    clearBroker = Broker.create({
      name: 'Clear',
      cnpj: new Cnpj('11.111.111/0001-11'),
      code: 'CLEAR',
      active: true,
    });

    brokerRepo.findAllByCodes.mockImplementation((codes) =>
      Promise.resolve([xpBroker, clearBroker].filter((broker) => codes.includes(broker.code))),
    );
    transactionRepo.saveMany.mockResolvedValue(undefined);
    transactionRepo.deleteInitialBalanceByTickerAndYear.mockResolvedValue(undefined);
    queue.publish.mockResolvedValue(undefined);
    assetRepo.findByTickersList.mockResolvedValue([]);

    useCase = new ImportConsolidatedPositionUseCase(
      parser,
      assetRepo,
      brokerRepo,
      transactionRepo,
      queue,
    );
  });

  it('imports and upserts positions for multiple tickers', async () => {
    parser.parse.mockResolvedValue([
      {
        ticker: 'PETR4',
        quantity: 100,
        averagePrice: 25.5,
        brokerCode: 'XP',
        sourceAssetType: AssetType.Stock,
        sourceAssetTypeLabel: 'Acao',
      },
      {
        ticker: 'VALE3',
        quantity: 50,
        averagePrice: 68,
        brokerCode: 'CLEAR',
        sourceAssetType: AssetType.Stock,
        sourceAssetTypeLabel: 'Acao',
      },
    ]);

    const result = await useCase.execute({
      filePath: '/path/to/file.csv',
      year: 2024,
      assetTypeOverrides: [],
    });

    expect(result.importedCount).toBe(2);
    expect(result.recalculatedTickers).toContain('PETR4');
    expect(result.recalculatedTickers).toContain('VALE3');
    expect(result.skippedUnsupportedRows).toBe(0);
    expect(transactionRepo.deleteInitialBalanceByTickerAndYear).toHaveBeenCalledWith('PETR4', 2024);
    expect(transactionRepo.deleteInitialBalanceByTickerAndYear).toHaveBeenCalledWith('VALE3', 2024);
    expect(transactionRepo.saveMany).toHaveBeenCalledTimes(2);
    expect(assetRepo.save).toHaveBeenCalledTimes(2);
    expect(queue.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        name: ConsolidatedPositionImportedEvent.name,
        ticker: 'PETR4',
        year: 2024,
      }),
    );
    expect(queue.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        name: ConsolidatedPositionImportedEvent.name,
        ticker: 'VALE3',
        year: 2024,
      }),
    );
    expect(brokerRepo.findAllByCodes).toHaveBeenCalledWith(['XP', 'CLEAR']);
  });

  it('groups same ticker+broker and keeps last row (upsert)', async () => {
    parser.parse.mockResolvedValue([
      {
        ticker: 'PETR4',
        quantity: 100,
        averagePrice: 25,
        brokerCode: 'XP',
        sourceAssetType: AssetType.Stock,
        sourceAssetTypeLabel: 'Acao',
      },
      {
        ticker: 'PETR4',
        quantity: 150,
        averagePrice: 26,
        brokerCode: 'XP',
        sourceAssetType: AssetType.Stock,
        sourceAssetTypeLabel: 'Acao',
      },
    ]);

    const result = await useCase.execute({
      filePath: '/path/to/file.csv',
      year: 2024,
      assetTypeOverrides: [],
    });

    expect(result.importedCount).toBe(1);
    expect(result.recalculatedTickers).toEqual(['PETR4']);
    const savedTransactions = transactionRepo.saveMany.mock.calls[0]?.[0];
    expect(savedTransactions).toHaveLength(1);
    expect(savedTransactions?.[0]?.ticker).toBe('PETR4');
    expect(savedTransactions?.[0]?.quantity.getAmount()).toBe('150');
    expect(savedTransactions?.[0]?.unitPrice.getAmount()).toBe('26');
    expect(savedTransactions?.[0]?.brokerId.value).toBe(xpBroker.id.value);
  });

  it('keeps multiple brokers for same ticker', async () => {
    parser.parse.mockResolvedValue([
      {
        ticker: 'PETR4',
        quantity: 100,
        averagePrice: 25,
        brokerCode: 'XP',
        sourceAssetType: AssetType.Stock,
        sourceAssetTypeLabel: 'Acao',
      },
      {
        ticker: 'PETR4',
        quantity: 50,
        averagePrice: 24,
        brokerCode: 'CLEAR',
        sourceAssetType: AssetType.Stock,
        sourceAssetTypeLabel: 'Acao',
      },
    ]);

    const result = await useCase.execute({
      filePath: '/path/to/file.csv',
      year: 2024,
      assetTypeOverrides: [],
    });

    expect(result.importedCount).toBe(2);
    const savedTransactions = transactionRepo.saveMany.mock.calls[0]?.[0];
    expect(savedTransactions).toHaveLength(2);
    expect(savedTransactions?.map((transaction) => ({
      ticker: transaction.ticker,
      quantity: transaction.quantity.getAmount(),
      brokerId: transaction.brokerId.value,
    }))).toEqual(
      expect.arrayContaining([
        { ticker: 'PETR4', quantity: '100', brokerId: xpBroker.id.value },
        { ticker: 'PETR4', quantity: '50', brokerId: clearBroker.id.value },
      ]),
    );
  });

  it('throws when broker code not found', async () => {
    parser.parse.mockResolvedValue([
      {
        ticker: 'PETR4',
        quantity: 100,
        averagePrice: 25.5,
        brokerCode: 'INVALID',
        sourceAssetType: AssetType.Stock,
        sourceAssetTypeLabel: 'Acao',
      },
    ]);

    await expect(
      useCase.execute({ filePath: '/path/to/file.csv', year: 2024, assetTypeOverrides: [] }),
    ).rejects.toThrow(/Corretora com codigo 'INVALID' nao encontrada/);

    expect(transactionRepo.saveMany).not.toHaveBeenCalled();
  });

  it('throws when year is invalid', async () => {
    parser.parse.mockResolvedValue([]);

    await expect(
      useCase.execute({ filePath: '/path/to/file.csv', year: 1999, assetTypeOverrides: [] }),
    ).rejects.toThrow(/Ano/);

    await expect(
      useCase.execute({ filePath: '/path/to/file.csv', year: 2101, assetTypeOverrides: [] }),
    ).rejects.toThrow(/Ano/);

    await expect(
      useCase.execute({ filePath: '/path/to/file.csv', year: 2024.5, assetTypeOverrides: [] }),
    ).rejects.toThrow(/Ano/);
  });

  it('returns preview with the same resolution semantics used by transaction preview', async () => {
    parser.parse.mockResolvedValue([
      {
        ticker: 'PETR4',
        quantity: 100,
        averagePrice: 25.5,
        brokerCode: 'XP',
        sourceAssetType: AssetType.Stock,
        sourceAssetTypeLabel: 'Acao',
      },
      {
        ticker: 'VALE3',
        quantity: 50,
        averagePrice: 68,
        brokerCode: 'CLEAR',
        sourceAssetType: null,
        sourceAssetTypeLabel: null,
      },
      {
        ticker: 'BOVA11',
        quantity: 3,
        averagePrice: 100,
        brokerCode: 'XP',
        sourceAssetType: null,
        sourceAssetTypeLabel: 'Cripto',
      },
    ]);
    assetRepo.findByTickersList.mockResolvedValue([
      Asset.create({
        ticker: 'VALE3',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.Manual,
      }),
    ]);

    const result = await useCase.preview({ filePath: '/path/to/file.csv' });

    expect(result.rows).toEqual([
      expect.objectContaining({
        ticker: 'PETR4',
        resolvedAssetType: AssetType.Stock,
        resolutionStatus: 'resolved_from_file',
        needsReview: false,
        unsupportedReason: null,
      }),
      expect.objectContaining({
        ticker: 'VALE3',
        resolvedAssetType: AssetType.Stock,
        resolutionStatus: 'resolved_from_catalog',
        needsReview: false,
        unsupportedReason: null,
      }),
      expect.objectContaining({
        ticker: 'BOVA11',
        resolvedAssetType: null,
        resolutionStatus: 'unresolved',
        needsReview: false,
        unsupportedReason: UnsupportedImportReason.UnsupportedAssetType,
      }),
    ]);
    expect(result.summary).toEqual({
      supportedRows: 2,
      pendingRows: 0,
      unsupportedRows: 1,
    });
    expect(brokerRepo.findAllByCodes).not.toHaveBeenCalled();
  });

  it('resolves brokers in bulk once for repeated broker codes', async () => {
    parser.parse.mockResolvedValue([
      {
        ticker: 'PETR4',
        quantity: 100,
        averagePrice: 25,
        brokerCode: 'XP',
        sourceAssetType: AssetType.Stock,
        sourceAssetTypeLabel: 'Acao',
      },
      {
        ticker: 'VALE3',
        quantity: 50,
        averagePrice: 24,
        brokerCode: 'xp',
        sourceAssetType: AssetType.Stock,
        sourceAssetTypeLabel: 'Acao',
      },
      {
        ticker: 'ITSA4',
        quantity: 30,
        averagePrice: 10,
        brokerCode: 'CLEAR',
        sourceAssetType: AssetType.Stock,
        sourceAssetTypeLabel: 'Acao',
      },
    ]);

    await useCase.execute({
      filePath: '/path/to/file.csv',
      year: 2024,
      assetTypeOverrides: [],
    });

    expect(brokerRepo.findAllByCodes).toHaveBeenCalledTimes(1);
    expect(brokerRepo.findAllByCodes).toHaveBeenCalledWith(['XP', 'CLEAR']);
  });

  it('persists manual overrides before recreating supported initial-balance rows', async () => {
    parser.parse.mockResolvedValue([
      {
        ticker: 'HGLG11',
        quantity: 12,
        averagePrice: 165,
        brokerCode: 'XP',
        sourceAssetType: null,
        sourceAssetTypeLabel: null,
      },
    ]);

    const result = await useCase.execute({
      filePath: '/path/to/file.csv',
      year: 2024,
      assetTypeOverrides: [{ ticker: 'HGLG11', assetType: AssetType.Fii }],
    });

    expect(result).toEqual({
      importedCount: 1,
      recalculatedTickers: ['HGLG11'],
      skippedUnsupportedRows: 0,
    });
    expect(assetRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: 'HGLG11',
        assetType: AssetType.Fii,
        resolutionSource: AssetTypeSource.Manual,
      }),
    );
    expect(assetRepo.save.mock.invocationCallOrder[0]).toBeLessThan(
      transactionRepo.saveMany.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it('rejects confirmation when a supported ticker remains unresolved without an override', async () => {
    parser.parse.mockResolvedValue([
      {
        ticker: 'ABEV3',
        quantity: 8,
        averagePrice: 14,
        brokerCode: 'XP',
        sourceAssetType: null,
        sourceAssetTypeLabel: null,
      },
    ]);

    await expect(
      useCase.execute({ filePath: '/path/to/file.csv', year: 2024, assetTypeOverrides: [] }),
    ).rejects.toThrow(/ABEV3/);

    expect(assetRepo.save).not.toHaveBeenCalled();
    expect(transactionRepo.saveMany).not.toHaveBeenCalled();
    expect(queue.publish).not.toHaveBeenCalled();
  });

  it('skips unsupported rows and recalculates only accepted supported tickers', async () => {
    parser.parse.mockResolvedValue([
      {
        ticker: 'PETR4',
        quantity: 100,
        averagePrice: 25,
        brokerCode: 'XP',
        sourceAssetType: AssetType.Stock,
        sourceAssetTypeLabel: 'Acao',
      },
      {
        ticker: 'BTC11',
        quantity: 1,
        averagePrice: 100,
        brokerCode: 'CLEAR',
        sourceAssetType: null,
        sourceAssetTypeLabel: 'Cripto',
      },
    ]);

    const result = await useCase.execute({
      filePath: '/path/to/file.csv',
      year: 2024,
      assetTypeOverrides: [],
    });

    expect(result).toEqual({
      importedCount: 1,
      recalculatedTickers: ['PETR4'],
      skippedUnsupportedRows: 1,
    });
    expect(transactionRepo.deleteInitialBalanceByTickerAndYear).toHaveBeenCalledTimes(1);
    expect(transactionRepo.deleteInitialBalanceByTickerAndYear).toHaveBeenCalledWith('PETR4', 2024);
    expect(transactionRepo.saveMany).toHaveBeenCalledTimes(1);
    expect(queue.publish).toHaveBeenCalledTimes(1);
    expect(queue.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        name: ConsolidatedPositionImportedEvent.name,
        ticker: 'PETR4',
        year: 2024,
      }),
    );
  });
});
