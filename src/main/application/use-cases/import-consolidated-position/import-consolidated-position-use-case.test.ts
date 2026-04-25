
import { mock } from 'jest-mock-extended';
import { ImportConsolidatedPositionUseCase } from './import-consolidated-position-use-case';
import type { ConsolidatedPositionParserPort } from '../../interfaces/consolidated-position-parser.port';
import type { BrokerRepository } from '../../repositories/broker.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import type { Queue } from '../../events/queue.interface';
import { Broker } from '../../../domain/portfolio/entities/broker.entity';
import { Cnpj } from '../../../domain/shared/cnpj.vo';
import { ConsolidatedPositionImportedEvent } from '../../../domain/events/consolidated-position-imported.event';

describe('ImportConsolidatedPositionUseCase', () => {
  let parser: jest.Mocked<ConsolidatedPositionParserPort>;
  let brokerRepo: jest.Mocked<BrokerRepository>;
  let transactionRepo: jest.Mocked<TransactionRepository>;
  let queue: jest.Mocked<Queue>;
  let useCase: ImportConsolidatedPositionUseCase;
  let xpBroker: Broker;
  let clearBroker: Broker;

  beforeEach(() => {
    parser = mock<ConsolidatedPositionParserPort>();
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

    useCase = new ImportConsolidatedPositionUseCase(parser, brokerRepo, transactionRepo, queue);
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
    expect(transactionRepo.deleteInitialBalanceByTickerAndYear).toHaveBeenCalledWith('PETR4', 2024);
    expect(transactionRepo.deleteInitialBalanceByTickerAndYear).toHaveBeenCalledWith('VALE3', 2024);
    expect(transactionRepo.saveMany).toHaveBeenCalledTimes(2);
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
          brokerId: expect.objectContaining({ value: xpBroker.id.value }),
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
        expect.objectContaining({
          ticker: 'PETR4',
          quantity: 100,
          brokerId: expect.objectContaining({ value: xpBroker.id.value }),
        }),
        expect.objectContaining({
          ticker: 'PETR4',
          quantity: 50,
          brokerId: expect.objectContaining({ value: clearBroker.id.value }),
        }),
      ]),
    );
  });

  it('throws when broker code not found', async () => {
    parser.parse.mockResolvedValue([
      { ticker: 'PETR4', quantity: 100, averagePrice: 25.5, brokerCode: 'INVALID' },
    ]);

    await expect(useCase.execute({ filePath: '/path/to/file.csv', year: 2024 })).rejects.toThrow(
      /Corretora com codigo 'INVALID' nao encontrada/,
    );

    expect(transactionRepo.saveMany).not.toHaveBeenCalled();
  });

  it('throws when year is invalid', async () => {
    parser.parse.mockResolvedValue([]);

    await expect(useCase.execute({ filePath: '/path/to/file.csv', year: 1999 })).rejects.toThrow(
      /Ano/,
    );

    await expect(useCase.execute({ filePath: '/path/to/file.csv', year: 2101 })).rejects.toThrow(
      /Ano/,
    );

    await expect(useCase.execute({ filePath: '/path/to/file.csv', year: 2024.5 })).rejects.toThrow(
      /Ano/,
    );
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
    expect(brokerRepo.findAllByCodes).not.toHaveBeenCalled();
  });

  it('resolves brokers in bulk once for repeated broker codes', async () => {
    parser.parse.mockResolvedValue([
      { ticker: 'PETR4', quantity: 100, averagePrice: 25, brokerCode: 'XP' },
      { ticker: 'VALE3', quantity: 50, averagePrice: 24, brokerCode: 'xp' },
      { ticker: 'ITSA4', quantity: 30, averagePrice: 10, brokerCode: 'CLEAR' },
    ]);

    await useCase.execute({
      filePath: '/path/to/file.csv',
      year: 2024,
    });

    expect(brokerRepo.findAllByCodes).toHaveBeenCalledTimes(1);
    expect(brokerRepo.findAllByCodes).toHaveBeenCalledWith(['XP', 'CLEAR']);
  });
});
