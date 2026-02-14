import { beforeEach, describe, expect, it } from '@jest/globals';
import { mock } from 'jest-mock-extended';
import { ImportConsolidatedPositionUseCase } from './import-consolidated-position-use-case';
import type { ConsolidatedPositionParserPort } from '../ports/consolidated-position-parser.port';
import type { BrokerRepositoryPort } from '../repositories/broker.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import type { RecalculatePositionUseCase } from './recalculate-position-use-case';

describe('ImportConsolidatedPositionUseCase', () => {
  let parser: jest.Mocked<ConsolidatedPositionParserPort>;
  let brokerRepo: jest.Mocked<BrokerRepositoryPort>;
  let transactionRepo: jest.Mocked<TransactionRepository>;
  let recalculateUseCase: jest.Mocked<RecalculatePositionUseCase>;
  let useCase: ImportConsolidatedPositionUseCase;

  beforeEach(() => {
    parser = mock<ConsolidatedPositionParserPort>();
    brokerRepo = mock<BrokerRepositoryPort>();
    transactionRepo = mock<TransactionRepository>();
    recalculateUseCase = mock<RecalculatePositionUseCase>();

    brokerRepo.findByCode.mockImplementation((code) =>
      Promise.resolve(
        code === 'XP'
          ? { id: 'broker-xp', name: 'XP', cnpj: '00.000.000/0001-00', codigo: 'XP' }
          : code === 'CLEAR'
            ? { id: 'broker-clear', name: 'Clear', cnpj: '11.111.111/0001-11', codigo: 'CLEAR' }
            : null,
      ),
    );
    transactionRepo.saveMany.mockResolvedValue(undefined);
    transactionRepo.deleteInitialBalanceByTickerAndYear.mockResolvedValue(undefined);
    recalculateUseCase.execute.mockResolvedValue(undefined);

    useCase = new ImportConsolidatedPositionUseCase(
      parser,
      brokerRepo,
      transactionRepo,
      recalculateUseCase,
    );
  });

  it('imports and upserts positions for multiple tickers', async () => {
    parser.parse.mockResolvedValue([
      { ticker: 'PETR4', quantity: 100, averagePrice: 25.5, brokerCode: 'XP' },
      { ticker: 'VALE3', quantity: 50, averagePrice: 68, brokerCode: 'CLEAR' },
    ]);

    const result = await useCase.execute({
      filePath: '/path/to/file.csv',
      year: 2024,
    });

    expect(result.importedCount).toBe(2);
    expect(result.recalculatedTickers).toContain('PETR4');
    expect(result.recalculatedTickers).toContain('VALE3');
    expect(transactionRepo.deleteInitialBalanceByTickerAndYear).toHaveBeenCalledWith(
      'PETR4',
      2024,
    );
    expect(transactionRepo.deleteInitialBalanceByTickerAndYear).toHaveBeenCalledWith(
      'VALE3',
      2024,
    );
    expect(transactionRepo.saveMany).toHaveBeenCalledTimes(2);
    expect(recalculateUseCase.execute).toHaveBeenCalledWith({
      ticker: 'PETR4',
      year: 2024,
    });
    expect(recalculateUseCase.execute).toHaveBeenCalledWith({
      ticker: 'VALE3',
      year: 2024,
    });
  });

  it('groups same ticker+broker and keeps last row (upsert)', async () => {
    parser.parse.mockResolvedValue([
      { ticker: 'PETR4', quantity: 100, averagePrice: 25, brokerCode: 'XP' },
      { ticker: 'PETR4', quantity: 150, averagePrice: 26, brokerCode: 'XP' },
    ]);

    const result = await useCase.execute({
      filePath: '/path/to/file.csv',
      year: 2024,
    });

    expect(result.importedCount).toBe(1);
    expect(result.recalculatedTickers).toEqual(['PETR4']);
    expect(transactionRepo.saveMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          ticker: 'PETR4',
          quantity: 150,
          unitPrice: 26,
          brokerId: 'broker-xp',
        }),
      ]),
    );
  });

  it('keeps multiple brokers for same ticker', async () => {
    parser.parse.mockResolvedValue([
      { ticker: 'PETR4', quantity: 100, averagePrice: 25, brokerCode: 'XP' },
      { ticker: 'PETR4', quantity: 50, averagePrice: 24, brokerCode: 'CLEAR' },
    ]);

    const result = await useCase.execute({
      filePath: '/path/to/file.csv',
      year: 2024,
    });

    expect(result.importedCount).toBe(2);
    expect(transactionRepo.saveMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ ticker: 'PETR4', quantity: 100, brokerId: 'broker-xp' }),
        expect.objectContaining({ ticker: 'PETR4', quantity: 50, brokerId: 'broker-clear' }),
      ]),
    );
  });

  it('throws when broker code not found', async () => {
    parser.parse.mockResolvedValue([
      { ticker: 'PETR4', quantity: 100, averagePrice: 25.5, brokerCode: 'INVALID' },
    ]);

    await expect(
      useCase.execute({ filePath: '/path/to/file.csv', year: 2024 }),
    ).rejects.toThrow(/Corretora com codigo 'INVALID' nao encontrada/);

    expect(transactionRepo.saveMany).not.toHaveBeenCalled();
  });

  it('throws when year is invalid', async () => {
    parser.parse.mockResolvedValue([]);

    await expect(
      useCase.execute({ filePath: '/path/to/file.csv', year: 1999 }),
    ).rejects.toThrow(/Ano/);

    await expect(
      useCase.execute({ filePath: '/path/to/file.csv', year: 2101 }),
    ).rejects.toThrow(/Ano/);

    await expect(
      useCase.execute({ filePath: '/path/to/file.csv', year: 2024.5 }),
    ).rejects.toThrow(/Ano/);
  });

  it('returns preview without resolving brokers', async () => {
    parser.parse.mockResolvedValue([
      { ticker: 'PETR4', quantity: 100, averagePrice: 25.5, brokerCode: 'XP' },
    ]);

    const result = await useCase.preview({ filePath: '/path/to/file.csv' });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      ticker: 'PETR4',
      quantity: 100,
      averagePrice: 25.5,
      brokerCode: 'XP',
    });
    expect(brokerRepo.findByCode).not.toHaveBeenCalled();
  });
});
