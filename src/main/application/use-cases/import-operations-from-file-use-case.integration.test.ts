import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Knex } from 'knex';
import * as XLSX from 'xlsx';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { AssetRepository } from '../../database/repositories/asset-repository';
import { OperationRepository } from '../../database/repositories/operation-repository';
import { CsvXlsxBrokerageNoteParser } from '../../infrastructure/parsers/csv-xlsx-brokerage-note.parser';
import { BrokerageNoteParserStrategy } from '../../infrastructure/parsers/brokerage-note-parser.strategy';
import { SqlitePortfolioPositionRepository } from '../../infrastructure/persistence/sqlite-portfolio-position.repository';
import { SqliteTradeOperationsQuery } from '../../infrastructure/persistence/sqlite-trade-operations.query';
import { ImportBrokerageNoteUseCase } from './import-brokerage-note-use-case';
import { ImportOperationsFromFileUseCase } from './import-operations-from-file-use-case';
import { ImportOperationsUseCase } from './import-operations-use-case';
import { RecalculateAssetPositionUseCase } from './recalculate-asset-position-use-case';

describe('ImportOperationsFromFileUseCase integration', () => {
  let database: Knex;
  let importOperationsFromFileUseCase: ImportOperationsFromFileUseCase;
  let operationRepository: OperationRepository;
  const createdDirectories: string[] = [];

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);

    const assetRepository = new AssetRepository(database);
    operationRepository = new OperationRepository(database);
    const portfolioPositionRepository = new SqlitePortfolioPositionRepository(assetRepository);
    const tradeOperationQuery = new SqliteTradeOperationsQuery(operationRepository);
    const recalculateAssetPositionUseCase = new RecalculateAssetPositionUseCase(
      portfolioPositionRepository,
      tradeOperationQuery,
    );
    const importBrokerageNoteUseCase = new ImportBrokerageNoteUseCase(
      operationRepository,
      recalculateAssetPositionUseCase,
    );
    const importOperationsUseCase = new ImportOperationsUseCase(importBrokerageNoteUseCase);
    const parserStrategy = new BrokerageNoteParserStrategy([new CsvXlsxBrokerageNoteParser()]);
    importOperationsFromFileUseCase = new ImportOperationsFromFileUseCase(
      parserStrategy,
      importOperationsUseCase,
    );
  });

  afterEach(async () => {
    await database.destroy();
    await Promise.all(
      createdDirectories.map(async (directoryPath) => {
        await fs.rm(directoryPath, { recursive: true, force: true });
      }),
    );
    createdDirectories.length = 0;
  });

  it('runs parser -> use case -> repository and keeps import idempotent by batch input', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'import-file-'));
    createdDirectories.push(directory);
    const filePath = path.join(directory, 'operations.csv');

    await fs.writeFile(
      filePath,
      [
        'Data;Tipo;Ticker;Quantidade;Preço Unitário;Taxas Totais;Corretora;Tipo Ativo;IRRF',
        '2025-06-10;Compra;PETR4;10;20;1.5;XP;stock;0',
        '2025-06-10;Compra;VALE3;5;40;1.5;XP;stock;0',
      ].join('\n'),
      'utf-8',
    );

    const firstRun = await importOperationsFromFileUseCase.execute({
      broker: 'XP',
      filePath,
      importBatchId: 'batch-integration',
    });
    const secondRun = await importOperationsFromFileUseCase.execute({
      broker: 'XP',
      filePath,
      importBatchId: 'batch-integration',
    });

    const operations = await operationRepository.findAll();
    expect(operations).toHaveLength(2);
    expect(firstRun).toEqual({
      createdOperationsCount: 2,
      recalculatedPositionsCount: 2,
    });
    expect(secondRun).toEqual({
      createdOperationsCount: 0,
      recalculatedPositionsCount: 0,
    });
    expect(operations.every((operation) => operation.importBatchId === 'batch-integration')).toBe(
      true,
    );
  });

  it('imports operations from xlsx file end-to-end', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'import-file-xlsx-'));
    createdDirectories.push(directory);
    const filePath = path.join(directory, 'operations.xlsx');

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([
      {
        Data: '2025-07-01',
        Tipo: 'Compra',
        Ticker: 'ITUB4',
        Quantidade: 4,
        'Preco Unitario': 30,
        'Taxas Totais': 1,
        Corretora: 'XP',
        'Tipo Ativo': 'stock',
      },
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    XLSX.writeFile(workbook, filePath);

    const result = await importOperationsFromFileUseCase.execute({
      broker: 'XP',
      filePath,
      importBatchId: 'batch-xlsx',
    });

    const operations = await operationRepository.findByTicker('ITUB4');
    expect(result).toEqual({
      createdOperationsCount: 1,
      recalculatedPositionsCount: 1,
    });
    expect(operations).toHaveLength(1);
    expect(operations[0]?.importBatchId).toBe('batch-xlsx');
  });
});
