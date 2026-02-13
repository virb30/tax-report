import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { AssetType, SourceType } from '../../../shared/types/domain';
import { createDatabaseConnection, initializeDatabase } from '../../database/database';
import { AssetRepository } from '../../database/repositories/asset-repository';
import { OperationRepository } from '../../database/repositories/operation-repository';
import { RecalculateAssetPositionUseCase } from '../../application/use-cases/recalculate-asset-position-use-case';
import { ImportBrokerageNoteUseCase } from '../../application/use-cases/import-brokerage-note-use-case';
import { ImportOperationsUseCase } from '../../application/use-cases/import-operations-use-case';
import { SetManualBaseUseCase } from '../../application/use-cases/set-manual-base-use-case';
import { ListPositionsUseCase } from '../../application/use-cases/list-positions-use-case';
import { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-assets-report-use-case';
import { LegacyPortfolioAcl } from '../../infrastructure/persistence/legacy/legacy-portfolio-acl';
import { BrokerageNoteParserStrategy } from '../../infrastructure/parsers/brokerage-note-parser.strategy';
import { CsvXlsxBrokerageNoteParser } from '../../infrastructure/parsers/csv-xlsx-brokerage-note.parser';
import {
  registerMainHandlers,
  type MainHandlersDependencies,
} from './register-main-handlers';

type IpcHandler = (_event: unknown, ...args: unknown[]) => unknown;

describe('IPC handlers integration', () => {
  let database: Knex;
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'tax-report-ipc-'));
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);
  });

  afterEach(async () => {
    await database.destroy();
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  });

  it('runs preview, confirm, manual base, list and report channels end-to-end', async () => {
    const assetRepository = new AssetRepository(database);
    const operationRepository = new OperationRepository(database);
    const acl = new LegacyPortfolioAcl(assetRepository, operationRepository);
    const recalculateAssetPositionUseCase = new RecalculateAssetPositionUseCase(acl, acl);
    const importBrokerageNoteUseCase = new ImportBrokerageNoteUseCase(
      operationRepository,
      recalculateAssetPositionUseCase,
    );
    const importOperationsUseCase = new ImportOperationsUseCase(importBrokerageNoteUseCase);
    const setManualBaseUseCase = new SetManualBaseUseCase(acl);
    const listPositionsUseCase = new ListPositionsUseCase(acl);
    const generateAssetsReportUseCase = new GenerateAssetsReportUseCase(acl, operationRepository);
    const parserStrategy = new BrokerageNoteParserStrategy([new CsvXlsxBrokerageNoteParser()]);

    const csvPath = path.join(temporaryDirectory, 'movements.csv');
    await fs.writeFile(
      csvPath,
      [
        'Data;Tipo;Ticker;Quantidade;Preco Unitario;Taxas Totais;Corretora;Tipo Ativo;IRRF',
        '2025-03-10;Compra;PETR4;10;20;1;XP;stock;0',
      ].join('\n'),
      'utf-8',
    );

    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: (channel: string, listener: IpcHandler) => {
        handlers.set(channel, listener);
      },
    };

    const dependencies: MainHandlersDependencies = {
      checkHealth: () => ({ status: 'ok' }),
      previewImportFromFile: async (input) => ({
        commands: await parserStrategy.parse({
          broker: input.broker,
          fileType: 'csv',
          filePath: input.filePath,
        }),
      }),
      importOperations: (input) => importOperationsUseCase.execute(input),
      confirmImportOperations: async (input) => {
        let createdOperationsCount = 0;
        let recalculatedPositionsCount = 0;
        for (const command of input.commands) {
          const result = await importOperationsUseCase.execute(command);
          createdOperationsCount += result.createdOperationsCount;
          recalculatedPositionsCount += result.recalculatedPositionsCount;
        }
        return {
          createdOperationsCount,
          recalculatedPositionsCount,
        };
      },
      setManualBase: (input) => setManualBaseUseCase.execute(input),
      listPositions: () => listPositionsUseCase.execute(),
      generateAssetsReport: (input) => generateAssetsReportUseCase.execute(input),
    };

    registerMainHandlers(ipcMain, dependencies);

    const healthHandler = handlers.get('app:health-check');
    const previewHandler = handlers.get('import:preview-file');
    const confirmHandler = handlers.get('import:confirm-operations');
    const setManualBaseHandler = handlers.get('portfolio:set-manual-base');
    const listPositionsHandler = handlers.get('portfolio:list-positions');
    const reportHandler = handlers.get('report:assets-annual');

    if (
      !healthHandler ||
      !previewHandler ||
      !confirmHandler ||
      !setManualBaseHandler ||
      !listPositionsHandler ||
      !reportHandler
    ) {
      throw new Error('Some IPC handlers are missing.');
    }

    expect(healthHandler({})).toEqual({ status: 'ok' });

    const previewResult = (await previewHandler({}, {
      broker: 'XP',
      filePath: csvPath,
    })) as { commands: Array<{ sourceType: SourceType }> };
    expect(previewResult.commands).toHaveLength(1);
    expect(previewResult.commands[0]?.sourceType).toBe(SourceType.Csv);

    const importResult = (await confirmHandler({}, {
      commands: previewResult.commands,
    })) as { createdOperationsCount: number; recalculatedPositionsCount: number };
    expect(importResult).toEqual({
      createdOperationsCount: 1,
      recalculatedPositionsCount: 1,
    });

    await setManualBaseHandler({}, {
      ticker: 'IVVB11',
      broker: 'XP',
      assetType: AssetType.Etf,
      quantity: 2,
      averagePrice: 300,
    });

    const positionsResult = (await listPositionsHandler({}, undefined)) as {
      items: Array<{ ticker: string }>;
    };
    expect(positionsResult.items.map((item) => item.ticker)).toEqual(
      expect.arrayContaining(['PETR4', 'IVVB11']),
    );

    const reportResult = (await reportHandler({}, { baseYear: 2025 })) as {
      referenceDate: string;
      items: Array<{ ticker: string }>;
    };
    expect(reportResult.referenceDate).toBe('2025-12-31');
    expect(reportResult.items.length).toBeGreaterThan(0);
  });
});
