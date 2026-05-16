import type { Request } from 'express';
import { mock, mockReset } from 'jest-mock-extended';
import type { HttpRequest } from '../../../../shared/infra/http/http.interface';
import { RecordingMemoryAdapterHttp } from '../../../../shared/infra/http/recording-memory-adapter.http';
import type { CreateBrokerUseCase } from '../../../application/use-cases/create-broker.use-case';
import type { DeleteAllPositionsUseCase } from '../../../application/use-cases/delete-all-positions.use-case';
import type { DeleteInitialBalanceDocumentUseCase } from '../../../application/use-cases/delete-initial-balance-document.use-case';
import type { DeletePositionUseCase } from '../../../application/use-cases/delete-position.use-case';
import type { ListAssetsUseCase } from '../../../application/use-cases/list-assets.use-case';
import type { ListBrokersUseCase } from '../../../application/use-cases/list-brokers.use-case';
import type { ListInitialBalanceDocumentsUseCase } from '../../../application/use-cases/list-initial-balance-documents.use-case';
import type { ListPositionsUseCase } from '../../../application/use-cases/list-positions.use-case';
import type { MigrateYearUseCase } from '../../../application/use-cases/migrate-year.use-case';
import type { RecalculatePositionUseCase } from '../../../application/use-cases/recalculate-position.use-case';
import type { RepairAssetTypeUseCase } from '../../../application/use-cases/repair-asset-type.use-case';
import type { SaveInitialBalanceDocumentUseCase } from '../../../application/use-cases/save-initial-balance-document.use-case';
import type { ToggleActiveBrokerUseCase } from '../../../application/use-cases/toggle-active-broker.use-case';
import type { UpdateAssetUseCase } from '../../../application/use-cases/update-asset.use-case';
import type { UpdateBrokerUseCase } from '../../../application/use-cases/update-broker.use-case';
import { AssetController } from './asset.controller';
import { BrokerController } from './broker.controller';
import { InitialBalanceController } from './initial-balance.controller';
import { PositionController } from './position.controller';

function createRequest(input: Partial<HttpRequest> = {}): HttpRequest {
  return {
    params: {},
    query: {},
    body: {},
    raw: {} as Request,
    ...input,
  };
}

describe('portfolio HTTP controllers', () => {
  const listAssetsUseCase = mock<ListAssetsUseCase>();
  const updateAssetUseCase = mock<UpdateAssetUseCase>();
  const repairAssetTypeUseCase = mock<RepairAssetTypeUseCase>();
  const listBrokersUseCase = mock<ListBrokersUseCase>();
  const createBrokerUseCase = mock<CreateBrokerUseCase>();
  const updateBrokerUseCase = mock<UpdateBrokerUseCase>();
  const toggleActiveBrokerUseCase = mock<ToggleActiveBrokerUseCase>();
  const listInitialBalanceDocumentsUseCase = mock<ListInitialBalanceDocumentsUseCase>();
  const saveInitialBalanceDocumentUseCase = mock<SaveInitialBalanceDocumentUseCase>();
  const deleteInitialBalanceDocumentUseCase = mock<DeleteInitialBalanceDocumentUseCase>();
  const listPositionsUseCase = mock<ListPositionsUseCase>();
  const deletePositionUseCase = mock<DeletePositionUseCase>();
  const deleteAllPositionsUseCase = mock<DeleteAllPositionsUseCase>();
  const recalculatePositionUseCase = mock<RecalculatePositionUseCase>();
  const migrateYearUseCase = mock<MigrateYearUseCase>();

  beforeEach(() => {
    mockReset(listAssetsUseCase);
    mockReset(updateAssetUseCase);
    mockReset(repairAssetTypeUseCase);
    mockReset(listBrokersUseCase);
    mockReset(createBrokerUseCase);
    mockReset(updateBrokerUseCase);
    mockReset(toggleActiveBrokerUseCase);
    mockReset(listInitialBalanceDocumentsUseCase);
    mockReset(saveInitialBalanceDocumentUseCase);
    mockReset(deleteInitialBalanceDocumentUseCase);
    mockReset(listPositionsUseCase);
    mockReset(deletePositionUseCase);
    mockReset(deleteAllPositionsUseCase);
    mockReset(recalculatePositionUseCase);
    mockReset(migrateYearUseCase);
  });

  it('registers broker routes on construction and delegates validated input', async () => {
    const http = new RecordingMemoryAdapterHttp();
    listBrokersUseCase.execute.mockResolvedValue({ items: [] });
    updateBrokerUseCase.execute.mockResolvedValue({ id: 'broker-id' } as never);

    new BrokerController(http, {
      listBrokersUseCase,
      createBrokerUseCase,
      updateBrokerUseCase,
      toggleActiveBrokerUseCase,
    });

    expect(http.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'get /api/brokers',
      'post /api/brokers',
      'patch /api/brokers/{id}',
      'post /api/brokers/{id}/toggle-active',
    ]);

    const listResponse = await http.routes[0].handler(
      createRequest({ query: { activeOnly: 'true' } }),
    );
    expect(listResponse).toEqual({
      statusCode: 200,
      body: { items: [] },
    });
    expect(listBrokersUseCase.execute).toHaveBeenCalledWith({ activeOnly: true });

    await http.routes[2].handler(
      createRequest({
        params: { id: 'broker-id' },
        body: { name: 'Clear' },
      }),
    );
    expect(updateBrokerUseCase.execute).toHaveBeenCalledWith({
      id: 'broker-id',
      name: 'Clear',
    });
  });

  it('registers asset routes on construction and keeps validation in the controller', async () => {
    const http = new RecordingMemoryAdapterHttp();
    listAssetsUseCase.execute.mockResolvedValue({ items: [] });
    updateAssetUseCase.execute.mockResolvedValue({ ticker: 'ABCD3' } as never);

    new AssetController(http, {
      listAssetsUseCase,
      updateAssetUseCase,
      repairAssetTypeUseCase,
    });

    expect(http.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'get /api/assets',
      'patch /api/assets/{ticker}',
      'post /api/assets/{ticker}/repair-type',
    ]);

    await http.routes[1].handler(
      createRequest({
        params: { ticker: 'ABCD3' },
        body: { assetType: 'stock' },
      }),
    );
    expect(updateAssetUseCase.execute).toHaveBeenCalledWith({
      ticker: 'ABCD3',
      assetType: 'stock',
    });

    await expect(
      http.routes[1].handler(
        createRequest({
          params: { ticker: 'ABCD3' },
          body: {},
        }),
      ),
    ).rejects.toThrow('Invalid request payload');
  });

  it('registers initial balance routes on construction and delegates parsed values', async () => {
    const http = new RecordingMemoryAdapterHttp();
    listInitialBalanceDocumentsUseCase.execute.mockResolvedValue({ items: [] });
    deleteInitialBalanceDocumentUseCase.execute.mockResolvedValue({ deleted: true });

    new InitialBalanceController(http, {
      listInitialBalanceDocumentsUseCase,
      saveInitialBalanceDocumentUseCase,
      deleteInitialBalanceDocumentUseCase,
    });

    expect(http.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'get /api/initial-balances',
      'post /api/initial-balances',
      'delete /api/initial-balances/{year}/{ticker}',
    ]);

    await http.routes[0].handler(createRequest({ query: { year: '2025' } }));
    expect(listInitialBalanceDocumentsUseCase.execute).toHaveBeenCalledWith({ year: 2025 });

    await http.routes[2].handler(
      createRequest({
        params: { year: '2025', ticker: 'ABCD3' },
      }),
    );
    expect(deleteInitialBalanceDocumentUseCase.execute).toHaveBeenCalledWith({
      year: 2025,
      ticker: 'ABCD3',
    });
  });

  it('registers position routes on construction and delegates parsed input', async () => {
    const http = new RecordingMemoryAdapterHttp();
    deleteAllPositionsUseCase.execute.mockResolvedValue({ deletedCount: 2 } as never);
    deletePositionUseCase.execute.mockResolvedValue({ deleted: true } as never);
    recalculatePositionUseCase.execute.mockResolvedValue({ totalQuantity: '1' } as never);

    new PositionController(http, {
      listPositionsUseCase,
      deletePositionUseCase,
      deleteAllPositionsUseCase,
      recalculatePositionUseCase,
      migrateYearUseCase,
    });

    expect(http.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'get /api/positions',
      'delete /api/positions',
      'delete /api/positions/{ticker}',
      'post /api/positions/recalculate',
      'post /api/positions/migrate-year',
    ]);

    await http.routes[1].handler(createRequest({ query: { year: '2025' } }));
    expect(deleteAllPositionsUseCase.execute).toHaveBeenCalledWith({ year: 2025 });

    await http.routes[2].handler(
      createRequest({
        params: { ticker: 'ABCD3' },
        query: { year: '2025' },
      }),
    );
    expect(deletePositionUseCase.execute).toHaveBeenCalledWith({
      ticker: 'ABCD3',
      year: 2025,
    });

    await http.routes[3].handler(
      createRequest({
        body: { ticker: 'ABCD3', year: 2025, averagePriceFeeMode: 'ignore' },
      }),
    );
    expect(recalculatePositionUseCase.execute).toHaveBeenCalledWith({
      ticker: 'ABCD3',
      year: 2025,
      averagePriceFeeMode: 'ignore',
    });
  });
});
