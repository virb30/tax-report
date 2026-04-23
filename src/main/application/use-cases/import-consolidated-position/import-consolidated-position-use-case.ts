import type {
  ImportConsolidatedPositionCommand,
  ImportConsolidatedPositionResult,
  PreviewConsolidatedPositionCommand,
  PreviewConsolidatedPositionResult,
} from '../../../../shared/contracts/import-consolidated-position.contract';
import { SourceType, TransactionType } from '../../../../shared/types/domain';
import type { ConsolidatedPositionParserPort } from '../../interfaces/consolidated-position-parser.port';
import type { BrokerRepository } from '../../repositories/broker.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import { Transaction } from '../../../domain/portfolio/entities/transaction.entity';
import { Uuid } from '../../../domain/shared/uuid.vo';
import type { Queue } from '../../events/queue.interface';
import { ConsolidatedPositionImportedEvent } from '../../../domain/events/consolidated-position-imported.event';
import { assertSupportedYear } from '../../../../shared/utils/year';
import type { ConsolidatedPositionRow } from '../../interfaces/consolidated-position-parser.port';
import { Broker } from '../../../domain/portfolio/entities/broker.entity';

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
    this.validatePreviewInput(input);
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
    this.validateExecuteInput(input);

    const rows = await this.parser.parse(input.filePath);
    const resolved = await this.resolveBrokers(rows);
    const grouped = this.groupByTickerAndBroker(resolved);

    const tickers = [...new Set(grouped.map((r) => r.ticker))];

    for (const ticker of tickers) {
      await this.transactionRepository.deleteInitialBalanceByTickerAndYear(ticker, input.year);

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

  private validatePreviewInput(input: PreviewConsolidatedPositionCommand): void {
    if (typeof input.filePath !== 'string' || input.filePath.trim().length === 0) {
      throw new Error('Caminho do arquivo inválido.');
    }
  }

  private validateExecuteInput(input: ImportConsolidatedPositionCommand): void {
    assertSupportedYear(input.year, {
      invalidTypeMessage: 'Ano inválido.',
      outOfRangeMessage: 'Ano deve estar entre 2000 e 2100.',
    });
    this.validatePreviewInput(input);
  }

  private async resolveBrokers(rows: ConsolidatedPositionRow[]): Promise<ResolvedRow[]> {
    const brokerMap = await this.loadBrokerMap(rows);

    return rows.map((row) => ({
      ticker: row.ticker,
      quantity: row.quantity,
      averagePrice: row.averagePrice,
      brokerId: this.requireBroker(brokerMap, row.brokerCode).id.value,
    }));
  }

  private async loadBrokerMap(rows: ConsolidatedPositionRow[]): Promise<Map<string, Broker>> {
    const uniqueCodes = [...new Set(rows.map((row) => row.brokerCode.trim().toUpperCase()))];
    const brokers = await this.brokerRepository.findAllByCodes(uniqueCodes);

    return new Map(brokers.map((broker) => [broker.code.trim().toUpperCase(), broker]));
  }

  private requireBroker(brokerMap: Map<string, Broker>, brokerCode: string): Broker {
    const normalizedBrokerCode = brokerCode.trim().toUpperCase();
    const broker = brokerMap.get(normalizedBrokerCode);

    if (!broker) {
      throw new Error(
        `Corretora com codigo '${brokerCode}' nao encontrada. Cadastre-a em Corretoras antes de importar.`,
      );
    }

    return broker;
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
