import type {
  ImportConsolidatedPositionCommand,
  ImportConsolidatedPositionResult,
  PreviewConsolidatedPositionCommand,
  PreviewConsolidatedPositionResult,
} from '@shared/contracts/import-consolidated-position.contract';
import { SourceType, TransactionType } from '../../../shared/types/domain';
import type { ConsolidatedPositionParserPort } from '../interfaces/consolidated-position-parser.port';
import type { BrokerRepository } from '../repositories/broker.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { Transaction } from '../../domain/portfolio/entities/transaction.entity';
import { Uuid } from '../../domain/shared/uuid.vo';
import type { Queue } from '../events/queue.interface';
import { ConsolidatedPositionImportedEvent } from '../../domain/events/consolidated-position-imported.event';

type ResolvedRow = {
  ticker: string;
  quantity: number;
  averagePrice: number;
  brokerId: string;
};

export class ImportConsolidatedPositionUseCase {
  constructor(
    private readonly parser: ConsolidatedPositionParserPort,
    private readonly brokerRepository: BrokerRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly queue: Queue,
  ) {}

  async preview(
    input: PreviewConsolidatedPositionCommand,
  ): Promise<PreviewConsolidatedPositionResult> {
    if (typeof input.filePath !== 'string' || input.filePath.trim().length === 0) {
      throw new Error('Caminho do arquivo inválido.');
    }
    const rows = await this.parser.parse(input.filePath);
    return {
      rows: rows.map((r) => ({
        ticker: r.ticker,
        quantity: r.quantity,
        averagePrice: r.averagePrice,
        brokerCode: r.brokerCode,
      })),
    };
  }

  async execute(
    input: ImportConsolidatedPositionCommand,
  ): Promise<ImportConsolidatedPositionResult> {
    this.validate(input);

    const rows = await this.parser.parse(input.filePath);
    const resolved = await this.resolveBrokers(rows);
    const grouped = this.groupByTickerAndBroker(resolved);

    const tickers = [...new Set(grouped.map((r) => r.ticker))];

    for (const ticker of tickers) {
      await this.transactionRepository.deleteInitialBalanceByTickerAndYear(
        ticker,
        input.year,
      );

      const tickerRows = grouped.filter((r) => r.ticker === ticker);
      const transactions = tickerRows.map((row) =>
        Transaction.create({
        date: `${input.year}-01-01`,
        type: TransactionType.InitialBalance,
        ticker: row.ticker,
        quantity: row.quantity,
        unitPrice: row.averagePrice,
        fees: 0,
        brokerId: Uuid.from(row.brokerId),
        sourceType: SourceType.Csv,
      }),
      );

      await this.transactionRepository.saveMany(transactions);
      const event = new ConsolidatedPositionImportedEvent({
        ticker,
        year: input.year,
      });
      await this.queue.publish(event);
    }

    return {
      importedCount: grouped.length,
      recalculatedTickers: tickers,
    };
  }

  private validate(input: ImportConsolidatedPositionCommand): void {
    if (typeof input.year !== 'number' || !Number.isInteger(input.year)) {
      throw new Error('Ano inválido.');
    }
    if (input.year < 2000 || input.year > 2100) {
      throw new Error('Ano deve estar entre 2000 e 2100.');
    }
    if (typeof input.filePath !== 'string' || input.filePath.trim().length === 0) {
      throw new Error('Caminho do arquivo inválido.');
    }
  }

  private async resolveBrokers(
    rows: Array<{ ticker: string; quantity: number; averagePrice: number; brokerCode: string }>,
  ): Promise<ResolvedRow[]> {
    const result: ResolvedRow[] = [];

    for (const row of rows) {
      const broker = await this.brokerRepository.findByCode(row.brokerCode);
      if (!broker) {
        throw new Error(
          `Corretora com codigo '${row.brokerCode}' nao encontrada. Cadastre-a em Corretoras antes de importar.`,
        );
      }
      result.push({
        ticker: row.ticker,
        quantity: row.quantity,
        averagePrice: row.averagePrice,
        brokerId: broker.id.value,
      });
    }

    return result;
  }

  private groupByTickerAndBroker(rows: ResolvedRow[]): ResolvedRow[] {
    const map = new Map<string, ResolvedRow>();

    for (const row of rows) {
      const key = `${row.ticker}::${row.brokerId}`;
      map.set(key, row);
    }

    return [...map.values()];
  }
}
