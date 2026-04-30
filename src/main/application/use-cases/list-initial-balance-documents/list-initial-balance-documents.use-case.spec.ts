import { mock } from 'jest-mock-extended';
import { AssetPosition } from '../../../domain/portfolio/entities/asset-position.entity';
import { Uuid } from '../../../domain/shared/uuid.vo';
import { AssetType } from '../../../../shared/types/domain';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import { ListInitialBalanceDocumentsUseCase } from './list-initial-balance-documents.use-case';

describe('ListInitialBalanceDocumentsUseCase', () => {
  const transactionRepository = mock<TransactionRepository>();
  const positionRepository = mock<AssetPositionRepository>();
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
        averagePrice: 21,
        totalQuantity: 15,
        allocations: [
          { brokerId: clearBrokerId, quantity: 5 },
          { brokerId: xpBrokerId, quantity: 10 },
        ],
      },
    ]);
    positionRepository.findAllByYear.mockResolvedValue([
      AssetPosition.create({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        year: 2025,
        totalQuantity: 15,
        averagePrice: 21,
        brokerBreakdown: [
          { brokerId: Uuid.from(clearBrokerId), quantity: 5 },
          { brokerId: Uuid.from(xpBrokerId), quantity: 10 },
        ],
      }),
    ]);
    useCase = new ListInitialBalanceDocumentsUseCase(transactionRepository, positionRepository);
  });

  it('groups saved allocations back into one document per ticker and year', async () => {
    await expect(useCase.execute({ year: 2025 })).resolves.toEqual({
      items: [
        {
          ticker: 'PETR4',
          year: 2025,
          assetType: AssetType.Stock,
          averagePrice: 21,
          totalQuantity: 15,
          allocations: [
            { brokerId: clearBrokerId, quantity: 5 },
            { brokerId: xpBrokerId, quantity: 10 },
          ],
        },
      ],
    });
  });
});
