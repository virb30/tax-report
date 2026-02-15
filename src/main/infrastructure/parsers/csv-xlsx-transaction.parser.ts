import { OperationType, TransactionType } from '../../../shared/types/domain';
import type {
  ParsedTransactionBatch,
  ParsedTransactionOperation,
} from '@shared/contracts/import-transactions.contract';
import type { ImportTransactionsParserPort } from '../../application/ports/import-transactions-parser.port';
import type { BrokerRepositoryPort } from '../../application/repositories/broker.repository';
import type { CsvXlsxBrokerageNoteParser } from './csv-xlsx-brokerage-note.parser';

function mapOperationTypeToTransactionType(operationType: OperationType): TransactionType {
  if (operationType === OperationType.Buy) {
    return TransactionType.Buy;
  }
  return TransactionType.Sell;
}

export class CsvXlsxTransactionParser implements ImportTransactionsParserPort {
  constructor(
    private readonly csvXlsxBrokerageNoteParser: CsvXlsxBrokerageNoteParser,
    private readonly brokerRepository: BrokerRepositoryPort,
  ) {}

  async parse(filePath: string): Promise<ParsedTransactionBatch[]> {
    const commands = await this.csvXlsxBrokerageNoteParser.parse(filePath);
    const batches: ParsedTransactionBatch[] = [];

    for (const cmd of commands) {
      const broker = await this.brokerRepository.findByCode(cmd.broker.trim().toUpperCase());
      if (!broker) {
        throw new Error(
          `Corretora com codigo '${cmd.broker}' nao encontrada. Cadastre-a em Corretoras antes de importar.`,
        );
      }

      const operations: ParsedTransactionOperation[] = cmd.operations.map((op) => ({
        ticker: op.ticker,
        type: mapOperationTypeToTransactionType(op.operationType),
        quantity: op.quantity,
        unitPrice: op.unitPrice,
      }));

      batches.push({
        tradeDate: cmd.tradeDate,
        brokerId: broker.id.value,
        totalOperationalCosts: cmd.totalOperationalCosts,
        operations,
      });
    }

    return batches;
  }
}
