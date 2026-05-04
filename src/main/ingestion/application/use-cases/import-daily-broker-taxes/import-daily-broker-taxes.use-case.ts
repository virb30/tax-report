import { Uuid } from '../../../../shared/domain/value-objects/uuid.vo';
import { Money } from '../../../../portfolio/domain/value-objects/money.vo';
import { DailyBrokerTax } from '../../../domain/entities/daily-broker-tax.entity';
import type { DailyBrokerTaxesParser } from '../../interfaces/daily-broker-taxes.parser.interface';
import type { DailyBrokerTaxRepository } from '../../repositories/daily-broker-tax.repository';
import type { ReallocateTransactionFeesService } from '../../services/reallocate-transaction-fees.service';
import type { ImportDailyBrokerTaxesInput } from './import-daily-broker-taxes.input';
import type { ImportDailyBrokerTaxesOutput } from './import-daily-broker-taxes.output';
import type { Queue } from '../../../../shared/application/events/queue.interface';
import { TransactionFeesReallocatedEvent } from '../../../../shared/domain/events/transaction-fees-reallocated.event';

type ParsedTax = Awaited<ReturnType<DailyBrokerTaxesParser['parse']>>['taxes'][number];

export class ImportDailyBrokerTaxesUseCase {
  constructor(
    private readonly dailyBrokerTaxesParser: DailyBrokerTaxesParser,
    private readonly dailyBrokerTaxRepository: DailyBrokerTaxRepository,
    private readonly reallocateTransactionFeesService: ReallocateTransactionFeesService,
    private readonly queue: Queue,
  ) {}

  async execute(input: ImportDailyBrokerTaxesInput): Promise<ImportDailyBrokerTaxesOutput> {
    const parsedFile = await this.dailyBrokerTaxesParser.parse(input.filePath);
    const uniqueTaxes = this.deduplicate(parsedFile.taxes);
    const recalculatedTickers = new Set<string>();

    for (const parsedTax of uniqueTaxes) {
      const tax = DailyBrokerTax.create({
        date: parsedTax.date,
        brokerId: Uuid.from(parsedTax.brokerId),
        fees: Money.from(parsedTax.fees),
        irrf: Money.from(parsedTax.irrf),
      });

      await this.dailyBrokerTaxRepository.upsert(tax);
      const reallocation = await this.reallocateTransactionFeesService.execute({
        date: tax.date,
        brokerId: tax.brokerId.value,
      });
      for (const position of reallocation.affectedPositions) {
        await this.queue.publish(new TransactionFeesReallocatedEvent(position));
      }
      reallocation.recalculatedTickers.forEach((ticker) => recalculatedTickers.add(ticker));
    }

    return {
      importedCount: uniqueTaxes.length,
      recalculatedTickers: [...recalculatedTickers],
    };
  }

  private deduplicate(taxes: ParsedTax[]): ParsedTax[] {
    const taxesByKey = new Map<string, ParsedTax>();
    for (const tax of taxes) {
      taxesByKey.set(`${tax.date}::${tax.brokerId}`, tax);
    }
    return [...taxesByKey.values()];
  }
}
