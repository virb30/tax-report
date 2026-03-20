import type { OperationType } from "../../../shared/types/domain";

export interface RecalculableTrade {
  operationType: OperationType;
  quantity: number;
  unitPrice: number;
  operationalCosts: number;
}

export interface TradeOperationQueryPort {
  findTradesByTickerAndBroker(input: { ticker: string; broker: string }): Promise<RecalculableTrade[]>;
}

