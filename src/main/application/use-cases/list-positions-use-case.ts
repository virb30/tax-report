import type {
  ListPositionsQuery,
  ListPositionsResult,
} from '@shared/contracts/list-positions.contract';
import type { PositionRepository } from '../repositories/position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import type { BrokerRepositoryPort } from '../repositories/broker.repository';
import { computePositionsFromTransactions } from '../services/compute-positions-from-transactions';

export class ListPositionsUseCase {
  constructor(
    private readonly positionRepository: PositionRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly brokerRepository: BrokerRepositoryPort,
  ) {}

  async execute(input: ListPositionsQuery): Promise<ListPositionsResult> {
    const referenceDate = `${input.baseYear}-12-31`;
    const transactions = await this.transactionRepository.findByPeriod({
      startDate: '0000-01-01',
      endDate: referenceDate,
    });

    const snapshots = await computePositionsFromTransactions(
      transactions,
      this.positionRepository,
    );

    const items = await Promise.all(
      snapshots.map(async (snapshot) => {
        const brokerBreakdown = await Promise.all(
          snapshot.brokerBreakdown.map(async (allocation) => {
            const broker = await this.brokerRepository.findById(allocation.brokerId);
            return {
              brokerId: allocation.brokerId,
              brokerName: broker?.name ?? allocation.brokerId,
              brokerCnpj: broker?.cnpj ?? '',
              quantity: allocation.quantity,
            };
          }),
        );

        const totalCost = snapshot.totalQuantity * snapshot.averagePrice;

        return {
          ticker: snapshot.ticker,
          assetType: snapshot.assetType,
          totalQuantity: snapshot.totalQuantity,
          averagePrice: snapshot.averagePrice,
          totalCost,
          brokerBreakdown,
        };
      }),
    );

    return { items };
  }
}
