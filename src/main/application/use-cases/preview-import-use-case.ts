import type { ImportTransactionsParserPort } from '../interfaces/transactions.parser.interface';
import type { TaxApportioner } from '../../domain/ingestion/tax-apportioner.service';
import type { ParsedTransactionBatch } from '@shared/contracts/import-transactions.contract';
import type {
  PreviewImportTransactionsCommand,
  PreviewImportTransactionsResult,
  PreviewTransactionItem,
} from '@shared/contracts/preview-import.contract';

export class PreviewImportUseCase {
  constructor(
    private readonly parser: ImportTransactionsParserPort,
    private readonly taxApportioner: TaxApportioner,
  ) {}

  async execute(input: PreviewImportTransactionsCommand): Promise<PreviewImportTransactionsResult> {
    const batches = await this.parser.parse(input.filePath);
    const transactionsPreview: PreviewTransactionItem[] = [];

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
        transactionsPreview.push({
          date: batch.tradeDate,
          ticker: op.ticker,
          type: op.type,
          quantity: op.quantity,
          unitPrice: op.unitPrice,
          fees,
          brokerId: batch.brokerId,
        });
      }
    }

    return {
      batches,
      transactionsPreview,
    };
  }
}
