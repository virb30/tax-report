import type {
  ListPositionsQuery,
  ListPositionsResult,
} from '@shared/contracts/list-positions.contract';
import type { PositionRepository } from '../repositories/position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import type { BrokerRepository } from '../repositories/broker.repository';
import { computePositionsFromTransactions } from '../services/compute-positions-from-transactions';

export class ListPositionsUseCase {
  constructor(
    private readonly positionRepository: PositionRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly brokerRepository: BrokerRepository,
  ) {}

  async execute(input: ListPositionsQuery): Promise<ListPositionsResult> {
    const referenceDate = `${input.baseYear}-12-31`;
    const transactions = await this.transactionRepository.findByPeriod({
      startDate: '0000-01-01',
      endDate: referenceDate,
    });

    const positions = await computePositionsFromTransactions(
      transactions,
      this.positionRepository,
      input.baseYear,
    );

    const items = await Promise.all(
      positions.map(async (position) => {
        const brokerBreakdown = await Promise.all(
          position.brokerBreakdown.map(async (allocation) => {
            const broker = await this.brokerRepository.findById(allocation.brokerId);
            return {
              brokerId: allocation.brokerId.value,
              brokerName: broker?.name ?? allocation.brokerId.value,
              brokerCnpj: broker?.cnpj?.value ?? '',
              quantity: allocation.quantity,
            };
          }),
        );

        const totalCost = position.totalQuantity * position.averagePrice;

        return {
          ticker: position.ticker,
          assetType: position.assetType,
          totalQuantity: position.totalQuantity,
          averagePrice: position.averagePrice,
          totalCost,
          brokerBreakdown,
        };
      }),
    );

    return { items };
  }
}
