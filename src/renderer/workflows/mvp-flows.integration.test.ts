import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Knex } from 'knex';
import { AssetType } from '../../shared/types/domain';
import type { ElectronApi } from '../../shared/types/electron-api';
import { createDatabaseConnection, initializeDatabase } from '../../main/database/database';
import { AssetRepository } from '../../main/database/repositories/asset-repository';
import { OperationRepository } from '../../main/database/repositories/operation-repository';
import { LegacyPortfolioAcl } from '../../main/infrastructure/persistence/legacy/legacy-portfolio-acl';
import { RecalculateAssetPositionUseCase } from '../../main/application/use-cases/recalculate-asset-position-use-case';
import { ImportBrokerageNoteUseCase } from '../../main/application/use-cases/import-brokerage-note-use-case';
import { ImportOperationsUseCase } from '../../main/application/use-cases/import-operations-use-case';
import { SetManualBaseUseCase } from '../../main/application/use-cases/set-manual-base-use-case';
import { ListPositionsUseCase } from '../../main/application/use-cases/list-positions-use-case';
import { GenerateAssetsReportUseCase } from '../../main/application/use-cases/generate-assets-report-use-case';
import { BrokerageNoteParserStrategy } from '../../main/infrastructure/parsers/brokerage-note-parser.strategy';
import { CsvXlsxBrokerageNoteParser } from '../../main/infrastructure/parsers/csv-xlsx-brokerage-note.parser';
import {
  registerMainHandlers,
  type MainHandlersDependencies,
} from '../../main/ipc/handlers/register-main-handlers';
import {
  runAnnualReport,
  runImportPreviewAndConfirm,
  runManualBaseAndRefresh,
} from './mvp-flows';

type IpcHandler = (_event: unknown, ...args: unknown[]) => unknown;

describe('MVP workflows integration', () => {
  let database: Knex;
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'tax-report-renderer-'));
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, true);
  });

  afterEach(async () => {
    await database.destroy();
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  });

  it('runs critical flows against real IPC handlers', async () => {
    const csvPath = path.join(temporaryDirectory, 'ops.csv');
    await fs.writeFile(
      csvPath,
      [
        'Data;Tipo;Ticker;Quantidade;Preco Unitario;Taxas Totais;Corretora;Tipo Ativo;IRRF',
        '2025-03-10;Compra;PETR4;10;20;1;XP;stock;0',
      ].join('\n'),
      'utf-8',
    );

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

    const handlers = new Map<string, IpcHandler>();
    const ipcMain = {
      handle: (channel: string, listener: IpcHandler) => {
        handlers.set(channel, listener);
      },
    };

    const mainHandlersDependencies: MainHandlersDependencies = {
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

    registerMainHandlers(ipcMain, mainHandlersDependencies);

    const electronApi = createElectronApiFromHandlers(handlers);

    const importResult = await runImportPreviewAndConfirm(electronApi, {
      broker: 'XP',
      filePath: csvPath,
    });
    expect(importResult.createdOperationsCount).toBe(1);

    const manualResult = await runManualBaseAndRefresh(electronApi, {
      ticker: 'IVVB11',
      broker: 'XP',
      assetType: AssetType.Etf,
      quantity: 2,
      averagePrice: 300,
    });
    expect(manualResult.positionsCount).toBe(2);

    const reportResult = await runAnnualReport(electronApi, {
      baseYear: 2025,
    });
    expect(reportResult.referenceDate).toBe('2025-12-31');
    expect(reportResult.itemsCount).toBe(2);
  });
});

function createElectronApiFromHandlers(handlers: Map<string, IpcHandler>): ElectronApi {
  async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
    const handler = handlers.get(channel);
    if (!handler) {
      throw new Error(`Handler ${channel} is not registered.`);
    }
    return Promise.resolve(handler({}, payload) as T);
  }

  return {
    appName: 'tax-report',
    previewImportFromFile: (input) => invoke('import:preview-file', input),
    importOperations: (input) => invoke('import:operations', input),
    confirmImportOperations: (input) => invoke('import:confirm-operations', input),
    setManualBase: (input) => invoke('portfolio:set-manual-base', input),
    listPositions: () => invoke('portfolio:list-positions'),
    generateAssetsReport: (input) => invoke('report:assets-annual', input),
  };
}
