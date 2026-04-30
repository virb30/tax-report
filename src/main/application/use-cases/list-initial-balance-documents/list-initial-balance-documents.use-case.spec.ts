import { Quantity } from '../../../domain/portfolio/value-objects/quantity.vo';
import { Money } from '../../../domain/portfolio/value-objects/money.vo';
import { mock } from 'jest-mock-extended';
import { Asset } from '../../../domain/portfolio/entities/asset.entity';
import { AssetPosition } from '../../../domain/portfolio/entities/asset-position.entity';
import { Uuid } from '../../../domain/shared/uuid.vo';
import { AssetType, AssetTypeSource } from '../../../../shared/types/domain';
import type { AssetRepository } from '../../repositories/asset.repository';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import { ListInitialBalanceDocumentsUseCase } from './list-initial-balance-documents.use-case';

describe('ListInitialBalanceDocumentsUseCase', () => {
  const transactionRepository = mock<TransactionRepository>();
  const positionRepository = mock<AssetPositionRepository>();
  const assetRepository = mock<AssetRepository>();
  let clearBrokerId: string;
  let xpBrokerId: string;
  let useCase: ListInitialBalanceDocumentsUseCase;

  beforeEach(() => {
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
        resolutionSource: AssetTypeSource.Manual,
      }),
    ]);

    await expect(useCase.execute({ year: 2025 })).resolves.toMatchObject({
      items: [
        {
          ticker: 'PETR4',
          assetType: AssetType.Fii,
        },
      ],
    });
  });
});
