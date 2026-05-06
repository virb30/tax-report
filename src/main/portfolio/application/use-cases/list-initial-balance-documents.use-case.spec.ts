import { Quantity } from '../../domain/value-objects/quantity.vo';
import { Money } from '../../domain/value-objects/money.vo';
import { mock, mockReset } from 'jest-mock-extended';
import { Asset } from '../../domain/entities/asset.entity';
import { AssetPosition } from '../../domain/entities/asset-position.entity';
import { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';
import { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import { AssetType, AssetTypeSource } from '../../../../shared/types/domain';
import type { AssetRepository } from '../repositories/asset.repository';
import type { AssetPositionRepository } from '../repositories/asset-position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { ListInitialBalanceDocumentsUseCase } from './list-initial-balance-documents.use-case';

describe('ListInitialBalanceDocumentsUseCase', () => {
  const transactionRepository = mock<TransactionRepository>();
  const positionRepository = mock<AssetPositionRepository>();
  const assetRepository = mock<AssetRepository>();
  let clearBrokerId: string;
  let xpBrokerId: string;
  let useCase: ListInitialBalanceDocumentsUseCase;

  beforeEach(() => {
    mockReset(transactionRepository);
    mockReset(positionRepository);
    mockReset(assetRepository);
    clearBrokerId = Uuid.create().value;
    xpBrokerId = Uuid.create().value;

    transactionRepository.findInitialBalanceDocumentsByYear.mockResolvedValue([
      {
        ticker: 'PETR4',
        year: 2025,
        averagePrice: '21',
        totalQuantity: '15',
        allocations: [
          { brokerId: clearBrokerId, quantity: '5' },
          { brokerId: xpBrokerId, quantity: '10' },
        ],
      },
    ]);
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(15),
        averagePrice: Money.from(21),
        brokerBreakdown: [
          { brokerId: Uuid.from(clearBrokerId), quantity: Quantity.from('5') },
          { brokerId: Uuid.from(xpBrokerId), quantity: Quantity.from('10') },
        ],
      }),
    ]);
    assetRepository.findByTickersList.mockResolvedValue([]);
    useCase = new ListInitialBalanceDocumentsUseCase(
      transactionRepository,
      positionRepository,
      assetRepository,
    );
  });

  it('groups saved allocations back into one document per ticker and year', async () => {
    await expect(useCase.execute({ year: 2025 })).resolves.toEqual({
      items: [
        {
          ticker: 'PETR4',
          year: 2025,
          assetType: AssetType.Stock,
          name: null,
          cnpj: null,
          averagePrice: '21',
          totalQuantity: '15',
          allocations: [
            { brokerId: clearBrokerId, quantity: '5' },
            { brokerId: xpBrokerId, quantity: '10' },
          ],
        },
      ],
    });
  });

  it('prefers the corrected catalog asset type over the stale persisted position type', async () => {
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: Quantity.from(15),
        averagePrice: Money.from(21),
        brokerBreakdown: [
          { brokerId: Uuid.from(clearBrokerId), quantity: Quantity.from('5') },
          { brokerId: Uuid.from(xpBrokerId), quantity: Quantity.from('10') },
        ],
      }),
    ]);
    assetRepository.findByTickersList.mockResolvedValue([
      Asset.create({
        ticker: 'PETR4',
        assetType: AssetType.Fii,
        issuerCnpj: new Cnpj('03.837.735/0001-17'),
        name: 'CSHG Logistica',
        resolutionSource: AssetTypeSource.Manual,
      }),
    ]);

    await expect(useCase.execute({ year: 2025 })).resolves.toMatchObject({
      items: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Fii,
          name: 'CSHG Logistica',
          cnpj: '03.837.735/0001-17',
        },
      ],
    });
  });
});
