import type { Request } from 'express';
import { mock, mockReset } from 'jest-mock-extended';
import type { HttpRequest } from '../../../../shared/infra/http/http.interface';
import { RecordingMemoryAdapterHttp } from '../../../../shared/infra/http/recording-memory-adapter.http';
import type { DeleteDailyBrokerTaxUseCase } from '../../../application/use-cases/delete-daily-broker-tax.use-case';
import type { ImportConsolidatedPositionUseCase } from '../../../application/use-cases/import-consolidated-position.use-case';
import type { ImportDailyBrokerTaxesUseCase } from '../../../application/use-cases/import-daily-broker-taxes.use-case';
import type { ImportTransactionsUseCase } from '../../../application/use-cases/import-transactions.use-case';
import type { ListDailyBrokerTaxesUseCase } from '../../../application/use-cases/list-daily-broker-taxes.use-case';
import type { PreviewImportUseCase } from '../../../application/use-cases/preview-import.use-case';
import type { SaveDailyBrokerTaxUseCase } from '../../../application/use-cases/save-daily-broker-tax.use-case';
import { ConsolidatedPositionImportController } from './consolidated-position-import.controller';
import { DailyBrokerTaxController } from './daily-broker-tax.controller';
import { TransactionsController } from './transactions.controller';

function createUploadedRequest(
  input: {
    body?: unknown;
    params?: Record<string, unknown>;
  } = {},
): HttpRequest {
  return {
    body: input.body ?? {},
    params: input.params ?? {},
    query: {},
    raw: {
      file: {
        path: '/tmp/upload.csv',
        originalname: 'upload.csv',
        size: 12,
      },
    } as Request,
  };
}

describe('ingestion HTTP controllers', () => {
  const previewImportUseCase = mock<PreviewImportUseCase>();
  const importTransactionsUseCase = mock<ImportTransactionsUseCase>();
  const listDailyBrokerTaxesUseCase = mock<ListDailyBrokerTaxesUseCase>();
  const saveDailyBrokerTaxUseCase = mock<SaveDailyBrokerTaxUseCase>();
  const importDailyBrokerTaxesUseCase = mock<ImportDailyBrokerTaxesUseCase>();
  const deleteDailyBrokerTaxUseCase = mock<DeleteDailyBrokerTaxUseCase>();
  const importConsolidatedPositionUseCase = mock<ImportConsolidatedPositionUseCase>();

  beforeEach(() => {
    mockReset(previewImportUseCase);
    mockReset(importTransactionsUseCase);
    mockReset(listDailyBrokerTaxesUseCase);
    mockReset(saveDailyBrokerTaxUseCase);
    mockReset(importDailyBrokerTaxesUseCase);
    mockReset(deleteDailyBrokerTaxUseCase);
    mockReset(importConsolidatedPositionUseCase);
  });

  it('registers transaction import routes and delegates multipart payloads to the use cases', async () => {
    const http = new RecordingMemoryAdapterHttp();
    previewImportUseCase.execute.mockResolvedValue({ preview: true } as never);
    importTransactionsUseCase.execute.mockResolvedValue({ importedCount: 1 } as never);

    new TransactionsController(http, {
      previewImportUseCase,
      importTransactionsUseCase,
    });

    expect(http.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: 'post',
          path: '/api/transactions/import:preview',
          middlewares: [{ type: 'spreadsheetUpload', fieldName: 'file' }],
        }),
        expect.objectContaining({
          method: 'post',
          path: '/api/transactions/import:confirm',
          middlewares: [{ type: 'spreadsheetUpload', fieldName: 'file' }],
        }),
      ]),
    );

    const previewRoute = http.routes.find((route) => route.path.endsWith('import:preview'));
    const confirmRoute = http.routes.find((route) => route.path.endsWith('import:confirm'));

    await expect(previewRoute?.handler(createUploadedRequest())).resolves.toEqual({
      statusCode: 200,
      body: { preview: true },
    });
    await expect(
      confirmRoute?.handler(
        createUploadedRequest({
          body: {
            assetTypeOverrides: JSON.stringify([{ ticker: 'ABCD3', assetType: 'stock' }]),
          },
        }),
      ),
    ).resolves.toEqual({
      statusCode: 200,
      body: { importedCount: 1 },
    });

    expect(previewImportUseCase.execute).toHaveBeenCalledWith({
      filePath: '/tmp/upload.csv',
    });
    expect(importTransactionsUseCase.execute).toHaveBeenCalledWith({
      filePath: '/tmp/upload.csv',
      assetTypeOverrides: [{ ticker: 'ABCD3', assetType: 'stock' }],
    });
  });

  it('registers daily broker tax routes and parses payloads before delegation', async () => {
    const http = new RecordingMemoryAdapterHttp();
    listDailyBrokerTaxesUseCase.execute.mockResolvedValue({ items: [] } as never);
    saveDailyBrokerTaxUseCase.execute.mockResolvedValue({ saved: true } as never);
    importDailyBrokerTaxesUseCase.execute.mockResolvedValue({ importedCount: 1 } as never);
    deleteDailyBrokerTaxUseCase.execute.mockResolvedValue({ deleted: true } as never);

    new DailyBrokerTaxController(http, {
      listDailyBrokerTaxesUseCase,
      saveDailyBrokerTaxUseCase,
      importDailyBrokerTaxesUseCase,
      deleteDailyBrokerTaxUseCase,
    });

    const listRoute = http.routes.find((route) => route.method === 'get');
    const saveRoute = http.routes.find(
      (route) => route.method === 'post' && route.path === '/api/daily-broker-taxes',
    );
    const importRoute = http.routes.find((route) => route.path.endsWith('/import'));
    const deleteRoute = http.routes.find((route) => route.method === 'delete');

    await expect(listRoute?.handler(createUploadedRequest())).resolves.toEqual({
      statusCode: 200,
      body: { items: [] },
    });
    await expect(
      saveRoute?.handler(
        createUploadedRequest({
          body: {
            date: '2026-01-10',
            brokerId: 'broker-1',
            fees: 10,
            irrf: 2,
          },
        }),
      ),
    ).resolves.toEqual({
      statusCode: 200,
      body: { saved: true },
    });
    await expect(importRoute?.handler(createUploadedRequest())).resolves.toEqual({
      statusCode: 200,
      body: { importedCount: 1 },
    });
    await expect(
      deleteRoute?.handler(
        createUploadedRequest({
          params: {
            date: '2026-01-10',
            brokerId: 'broker-1',
          },
        }),
      ),
    ).resolves.toEqual({
      statusCode: 200,
      body: { deleted: true },
    });

    expect(saveDailyBrokerTaxUseCase.execute).toHaveBeenCalledWith({
      date: '2026-01-10',
      brokerId: 'broker-1',
      fees: 10,
      irrf: 2,
    });
    expect(importDailyBrokerTaxesUseCase.execute).toHaveBeenCalledWith({
      filePath: '/tmp/upload.csv',
    });
    expect(deleteDailyBrokerTaxUseCase.execute).toHaveBeenCalledWith({
      date: '2026-01-10',
      brokerId: 'broker-1',
    });
  });

  it('registers consolidated position routes and parses multipart fields before delegation', async () => {
    const http = new RecordingMemoryAdapterHttp();
    importConsolidatedPositionUseCase.preview.mockResolvedValue({ rows: [] } as never);
    importConsolidatedPositionUseCase.execute.mockResolvedValue({ importedCount: 1 } as never);

    new ConsolidatedPositionImportController(http, {
      importConsolidatedPositionUseCase,
    });

    expect(http.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/api/positions/consolidated-preview',
          middlewares: [{ type: 'spreadsheetUpload', fieldName: 'file' }],
        }),
        expect.objectContaining({
          path: '/api/positions/consolidated-import',
          middlewares: [{ type: 'spreadsheetUpload', fieldName: 'file' }],
        }),
      ]),
    );

    const previewRoute = http.routes.find((route) => route.path.endsWith('preview'));
    const importRoute = http.routes.find((route) => route.path.endsWith('import'));

    await expect(previewRoute?.handler(createUploadedRequest())).resolves.toEqual({
      statusCode: 200,
      body: { rows: [] },
    });
    await expect(
      importRoute?.handler(
        createUploadedRequest({
          body: {
            year: '2026',
            assetTypeOverrides: JSON.stringify([{ ticker: 'ABCD3', assetType: 'stock' }]),
          },
        }),
      ),
    ).resolves.toEqual({
      statusCode: 200,
      body: { importedCount: 1 },
    });

    expect(importConsolidatedPositionUseCase.preview).toHaveBeenCalledWith({
      filePath: '/tmp/upload.csv',
    });
    expect(importConsolidatedPositionUseCase.execute).toHaveBeenCalledWith({
      filePath: '/tmp/upload.csv',
      year: 2026,
      assetTypeOverrides: [{ ticker: 'ABCD3', assetType: 'stock' }],
    });
  });
});
