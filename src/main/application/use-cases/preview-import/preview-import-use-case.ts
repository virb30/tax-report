import type { ImportTransactionsParser } from '../../interfaces/transactions.parser.interface';
import type { TaxApportioner } from '../../../domain/ingestion/tax-apportioner.service';
import type {
  PreviewImportTransactionsCommand,
  PreviewImportTransactionsResult,
  PreviewTransactionItem,
  PreviewImportWarning,
} from '../../../../shared/contracts/preview-import.contract';
import { TransactionType } from '../../../../shared/types/domain';

export class PreviewImportUseCase {
  constructor(
    private readonly parser: ImportTransactionsParser,
    private readonly taxApportioner: TaxApportioner,
  ) {}

  async execute(input: PreviewImportTransactionsCommand): Promise<PreviewImportTransactionsResult> {
    const batches = await this.parser.parse(input.filePath);
    const transactionsPreview: PreviewTransactionItem[] = [];
    const warnings: PreviewImportWarning[] = [];
    let globalRowIndex = 1;

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

        if (op.type === TransactionType.Bonus && (!op.unitPrice || op.unitPrice <= 0)) {
          warnings.push({
            row: globalRowIndex,
            message: `A bonificação do ativo ${op.ticker} está com custo unitário zerado. É recomendado informar o custo unitário conforme fato relevante.`,
            type: 'BONUS_MISSING_COST',
          });
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

        globalRowIndex += 1;
      }
    }

    return {
      batches,
      transactionsPreview,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}
