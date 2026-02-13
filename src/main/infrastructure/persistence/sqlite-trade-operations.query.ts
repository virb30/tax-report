import type {
  RecalculableTrade,
  TradeOperationQueryPort,
} from '../../application/queries/trade-operation.query.interface';
import type { OperationRepository } from '../../database/repositories/operation-repository';
import type { Operation } from '../../../shared/types/domain';

function mapOperationToRecalculableTrade(operation: Operation): RecalculableTrade {
  return {
    operationType: operation.operationType,
    quantity: operation.quantity,
    unitPrice: operation.unitPrice,
    operationalCosts: operation.operationalCosts,
  };
}

export class SqliteTradeOperationsQuery implements TradeOperationQueryPort {
  constructor(private readonly operationRepository: OperationRepository) {}

  async findTradesByTickerAndBroker(input: {
    ticker: string;
    broker: string;
  }): Promise<RecalculableTrade[]> {
    const operations = await this.operationRepository.findByTicker(input.ticker);
    return operations
      .filter((operation) => operation.broker === input.broker)
      .map(mapOperationToRecalculableTrade);
  }
}
