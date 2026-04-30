import { mock, mockReset } from 'jest-mock-extended';
import { AssetType, AssetTypeSource } from '../../../../shared/types/domain';
import { Asset } from '../../../domain/portfolio/entities/asset.entity';
import { Money } from '../../../domain/portfolio/value-objects/money.vo';
import { Quantity } from '../../../domain/portfolio/value-objects/quantity.vo';
import { Cnpj } from '../../../domain/shared/cnpj.vo';
import { Uuid } from '../../../domain/shared/uuid.vo';
import type { AssetRepository } from '../../repositories/asset.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import type { InitialBalanceDocumentPositionSyncService } from '../../services/initial-balance-document-position-sync.service';
import { SaveInitialBalanceDocumentUseCase } from './save-initial-balance-document.use-case';

describe('SaveInitialBalanceDocumentUseCase', () => {
  const assetRepository = mock<AssetRepository>();
  const transactionRepository = mock<TransactionRepository>();
  const positionSyncService = mock<InitialBalanceDocumentPositionSyncService>();
  let useCase: SaveInitialBalanceDocumentUseCase;

  beforeEach(() => {
    mockReset(assetRepository);
    mockReset(transactionRepository);
    mockReset(positionSyncService);
    assetRepository.findByTicker.mockResolvedValue(null);
    assetRepository.save.mockResolvedValue(undefined);
    transactionRepository.replaceInitialBalanceTransactionsForTickerAndYear.mockClear();
    positionSyncService.sync.mockClear();
    transactionRepository.replaceInitialBalanceTransactionsForTickerAndYear.mockResolvedValue(
      undefined,
    );
    positionSyncService.sync.mockResolvedValue({
      totalQuantity: Quantity.from(15),
      averagePrice: Money.from(21),
    });
    useCase = new SaveInitialBalanceDocumentUseCase(
      transactionRepository,
      positionSyncService,
      assetRepository,
    );
  });

  it('replaces all prior rows for the same ticker and year and returns the grouped document', async () => {
    const xpBrokerId = Uuid.create().value;
    const clearBrokerId = Uuid.create().value;

    const result = await useCase.execute({
      ticker: 'PETR4',
      year: 2025,
      assetType: AssetType.Stock,
      averagePrice: '21',
      allocations: [
        { brokerId: xpBrokerId, quantity: '10' },
        { brokerId: clearBrokerId, quantity: '5' },
      ],
    });

    expect(
      transactionRepository.replaceInitialBalanceTransactionsForTickerAndYear,
    ).toHaveBeenCalledWith('PETR4', 2025, expect.any(Array));
    const savedTransactions =
      transactionRepository.replaceInitialBalanceTransactionsForTickerAndYear.mock.calls[0]?.[2] ??
      [];
    expect(savedTransactions).toHaveLength(2);
    expect(savedTransactions[0]?.ticker).toBe('PETR4');
    expect(savedTransactions[0]?.quantity.getAmount()).toBe('10');
    expect(savedTransactions[0]?.unitPrice.getAmount()).toBe('21');
    expect(savedTransactions[0]?.date).toBe('2025-01-01');
    expect(savedTransactions[1]?.ticker).toBe('PETR4');
    expect(savedTransactions[1]?.quantity.getAmount()).toBe('5');
    expect(savedTransactions[1]?.unitPrice.getAmount()).toBe('21');
    expect(savedTransactions[1]?.date).toBe('2025-01-01');
    expect(positionSyncService.sync).toHaveBeenCalledWith({
      ticker: 'PETR4',
      year: 2025,
      assetType: AssetType.Stock,
    });
    expect(assetRepository.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ticker: 'PETR4',
      year: 2025,
      assetType: AssetType.Stock,
      name: null,
      cnpj: null,
      averagePrice: '21',
      allocations: [
        { brokerId: xpBrokerId, quantity: '10' },
        { brokerId: clearBrokerId, quantity: '5' },
      ],
      totalQuantity: '15',
    });
  });

  it('creates a catalog asset and fills missing issuer metadata from the document', async () => {
    const xpBrokerId = Uuid.create().value;

    const result = await useCase.execute({
      ticker: 'HGLG11',
      year: 2025,
      assetType: AssetType.Fii,
      name: 'CSHG Logistica',
      cnpj: '03.837.735/0001-17',
      averagePrice: '145',
      allocations: [{ brokerId: xpBrokerId, quantity: '10' }],
    });

    const savedAsset = assetRepository.save.mock.calls[0]?.[0];

    expect(savedAsset?.ticker).toBe('HGLG11');
    expect(savedAsset?.assetType).toBe(AssetType.Fii);
    expect(savedAsset?.resolutionSource).toBe(AssetTypeSource.Manual);
    expect(savedAsset?.name).toBe('CSHG Logistica');
    expect(savedAsset?.issuerCnpj).toBe('03.837.735/0001-17');
    expect(result).toEqual({
      ticker: 'HGLG11',
      year: 2025,
      assetType: AssetType.Fii,
      name: 'CSHG Logistica',
      cnpj: '03.837.735/0001-17',
      averagePrice: '145',
      allocations: [{ brokerId: xpBrokerId, quantity: '10' }],
      totalQuantity: '15',
    });
  });

  it('preserves existing issuer metadata and ignores blank values while still updating asset type', async () => {
    const xpBrokerId = Uuid.create().value;
    assetRepository.findByTicker.mockResolvedValue(
      Asset.create({
        ticker: 'IVVB11',
        issuerCnpj: new Cnpj('11.111.111/0001-11'),
        name: 'iShares Original',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.File,
      }),
    );

    await useCase.execute({
      ticker: 'IVVB11',
      year: 2025,
      assetType: AssetType.Etf,
      name: '   ',
      cnpj: '   ',
      averagePrice: '300',
      allocations: [{ brokerId: xpBrokerId, quantity: '2' }],
    });

    const savedAsset = assetRepository.save.mock.calls[0]?.[0];

    expect(savedAsset?.assetType).toBe(AssetType.Etf);
    expect(savedAsset?.resolutionSource).toBe(AssetTypeSource.Manual);
    expect(savedAsset?.name).toBe('iShares Original');
    expect(savedAsset?.issuerCnpj).toBe('11.111.111/0001-11');
  });

  it('rejects zero or negative allocation quantities', async () => {
    const xpBrokerId = Uuid.create().value;

    await expect(
      useCase.execute({
        ticker: 'PETR4',
        year: 2025,
        assetType: AssetType.Stock,
        averagePrice: '21',
        allocations: [{ brokerId: xpBrokerId, quantity: '0' }],
      }),
    ).rejects.toThrow('Quantidade deve ser maior que zero.');

    expect(
      transactionRepository.replaceInitialBalanceTransactionsForTickerAndYear,
    ).not.toHaveBeenCalled();
    expect(assetRepository.save).not.toHaveBeenCalled();
  });
});
