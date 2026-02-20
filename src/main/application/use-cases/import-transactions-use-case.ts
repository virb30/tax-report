import { randomUUID } from 'node:crypto';
import { SourceType } from '../../../shared/types/domain';
import type { TransactionRecord } from '../../domain/portfolio/entities/transaction.entity';
import type { TaxApportioner } from '../../domain/ingestion/tax-apportioner.service';
import type { ImportTransactionsParserPort } from '../interfaces/transactions.parser.interface';
import type { TransactionRepository } from '../repositories/transaction.repository';
import type { RecalculatePositionUseCase } from './recalculate-position-use-case';
import type {
  ImportTransactionsCommand,
  ImportTransactionsResult,
} from '@shared/contracts/import-transactions.contract';

export class ImportTransactionsUseCase {
  constructor(
    private readonly parser: ImportTransactionsParserPort,
    private readonly taxApportioner: TaxApportioner,
    private readonly transactionRepository: TransactionRepository,
    private readonly recalculatePositionUseCase: RecalculatePositionUseCase,
  ) {}

  async execute(input: ImportTransactionsCommand): Promise<ImportTransactionsResult> {
    const batches = await this.parser.parse(input.filePath);
    const importBatchId = `batch-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const allTransactions: TransactionRecord[] = [];
    const affectedTickers = new Set<string>();

    for (const batch of batches) {
      const allocatedFees = this.taxApportioner.allocate({
        totalOperationalCosts: batch.totalOperationalCosts,
        operations: batch.operations.map((op) => ({
          ticker: op.ticker,
          quantity: op.quantity,
          unitPrice: op.unitPrice,
        })),
      });

      for (let i = 0; i < batch.operations.length; i += 1) {
        const op = batch.operations[i];
        const fees = allocatedFees[i] ?? 0;
        if (!op) {
          continue;
        }
        const externalRef = createExternalRef({
          tradeDate: batch.tradeDate,
          type: op.type,
          ticker: op.ticker,
          quantity: op.quantity,
          unitPrice: op.unitPrice,
          fees,
          brokerId: batch.brokerId,
          sourceType: SourceType.Csv,
        });
        allTransactions.push({
          id: randomUUID(),
          date: batch.tradeDate,
          type: op.type,
          ticker: op.ticker,
          quantity: op.quantity,
          unitPrice: op.unitPrice,
          fees,
          brokerId: batch.brokerId,
          sourceType: SourceType.Csv,
          externalRef,
          importBatchId,
        });
        affectedTickers.add(op.ticker);
      }
    }

    const existingRefs = await this.transactionRepository.findExistingExternalRefs(
      allTransactions.map((t) => t.externalRef!).filter(Boolean),
    );
    const newTransactions = allTransactions.filter((t) => !existingRefs.has(t.externalRef!));

    if (newTransactions.length > 0) {
      await this.transactionRepository.saveMany(newTransactions);
    }

    const tickerYears = new Map<string, Set<number>>();
    for (const tx of newTransactions) {
      const year = parseInt(tx.date.slice(0, 4), 10);
      if (!tickerYears.has(tx.ticker)) {
        tickerYears.set(tx.ticker, new Set());
      }
      tickerYears.get(tx.ticker)!.add(year);
    }
    for (const [ticker, years] of tickerYears) {
      for (const year of years) {
        await this.recalculatePositionUseCase.execute({ ticker, year });
      }
    }

    return {
      importedCount: newTransactions.length,
      recalculatedTickers: [...affectedTickers],
    };
  }
}

function createExternalRef(input: {
  tradeDate: string;
  type: TransactionRecord['type'];
  ticker: string;
  quantity: number;
  unitPrice: number;
  fees: number;
  brokerId: string;
  sourceType: SourceType;
}): string {
  return [
    input.tradeDate,
    input.type,
    input.ticker,
    input.quantity.toString(),
    input.unitPrice.toFixed(8),
    input.fees.toFixed(8),
    input.brokerId,
    input.sourceType,
  ].join('|');
}
