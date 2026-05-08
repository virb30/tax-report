import { TransactionType } from '../../../shared/types/domain';
import { SourceType } from '../../../shared/types/domain';
import type { AssetPositionRepository } from '../repositories/asset-position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { Transaction } from '../../domain/entities/transaction.entity';
import type { AssetPosition } from '../../domain/entities/asset-position.entity';
import { PositionCalculatorService } from '../../domain/services/position-calculator.service';
import { assertSupportedYear } from '../../../../shared/utils/year';
import { Money } from '../../domain/value-objects/money.vo';
import { AppError } from '../../../shared/app-error';

export interface MigrateYearInput {
  sourceYear: number;
  targetYear: number;
}

export interface MigrateYearOutput {
  migratedPositionsCount: number;
  createdTransactionsCount: number;
  message?: string;
}

export class MigrateYearUseCase {
  constructor(
    private readonly positionRepository: AssetPositionRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: MigrateYearInput): Promise<MigrateYearOutput> {
    this.validateInput(input);

    const targetYearStart = `${input.targetYear}-01-01`;
    const targetYearEnd = `${input.targetYear}-12-31`;

    const existingTargetYearTransactions = await this.transactionRepository.findByPeriod({
      startDate: targetYearStart,
      endDate: targetYearEnd,
    });

    const tickersWithInitialBalance = this.findTickersWithInitialBalance(
      existingTargetYearTransactions,
    );

    const sourceYearPositions = await this.positionRepository.findAllByYear(input.sourceYear);
    const targetInitialBalanceTransactions: Transaction[] = [];
    const sourceTickerSet = new Set(sourceYearPositions.map((position) => position.ticker));

    sourceYearPositions.forEach((position) => {
      if (tickersWithInitialBalance.has(position.ticker)) {
        return;
      }

      position.brokerBreakdown.forEach((broker) => {
        if (broker.quantity.toNumber() <= 0) return;
        const transaction = Transaction.create({
          type: TransactionType.InitialBalance,
          date: targetYearStart,
          ticker: position.ticker,
          quantity: broker.quantity,
          unitPrice: position.averagePrice,
          fees: Money.from(0),
          brokerId: broker.brokerId,
          sourceType: SourceType.Manual,
        });
        targetInitialBalanceTransactions.push(transaction);
      });
    });

    const positionCalculator = new PositionCalculatorService();
    const relevantTargetYearTransactions = this.orderTargetYearTransactions(
      [...existingTargetYearTransactions, ...targetInitialBalanceTransactions].filter((transaction) =>
        sourceTickerSet.has(transaction.ticker),
      ),
    );

    let positionsAtYearEnd: AssetPosition[];
    try {
      positionsAtYearEnd = positionCalculator.compute({
        transactions: relevantTargetYearTransactions,
        basePositions: [],
        year: input.targetYear,
      });
    } catch (error: unknown) {
      throw new AppError(
        'MIGRATION_FAILED',
        this.buildMigrationFailureMessage(error, input),
        'business',
        error,
      );
    }

    const positionsWithQuantity = positionsAtYearEnd.filter((p) => p.totalQuantity.toNumber() > 0);

    if (positionsWithQuantity.length === 0) {
      return {
        migratedPositionsCount: 0,
        createdTransactionsCount: 0,
        message: `Nenhuma posição com quantidade em 31/12/${input.sourceYear}. Não há posições para migrar.`,
      };
    }

    await this.transactionRepository.saveMany(targetInitialBalanceTransactions);
    await this.positionRepository.saveMany(positionsWithQuantity);

    return {
      migratedPositionsCount: positionsWithQuantity.length,
      createdTransactionsCount: targetInitialBalanceTransactions.length,
    };
  }

  private findTickersWithInitialBalance(
    existingTargetYearTransactions: Transaction[],
  ): Set<string> {
    return new Set(
      existingTargetYearTransactions
        .filter((transaction) => transaction.isInitialBalance())
        .map((transaction) => transaction.ticker),
    );
  }

  private orderTargetYearTransactions(transactions: Transaction[]): Transaction[] {
    return [...transactions].sort((left, right) => {
      const dateOrder = left.date.localeCompare(right.date);
      if (dateOrder !== 0) {
        return dateOrder;
      }

      if (left.isInitialBalance() === right.isInitialBalance()) {
        return 0;
      }

      return left.isInitialBalance() ? -1 : 1;
    });
  }

  private validateInput(input: MigrateYearInput): void {
    assertSupportedYear(input.sourceYear, { invalidTypeMessage: 'Ano de origem inválido.' });
    assertSupportedYear(input.targetYear, { invalidTypeMessage: 'Ano de destino inválido.' });
    if (input.targetYear !== input.sourceYear + 1) {
      throw new Error('O ano de destino deve ser exatamente o ano de origem + 1.');
    }
  }

  private buildMigrationFailureMessage(error: unknown, input: MigrateYearInput): string {
    if (error instanceof Error && error.message.length > 0) {
      return `Falha ao migrar posições de ${input.sourceYear} para ${input.targetYear}: ${error.message}`;
    }

    return `Falha ao migrar posições de ${input.sourceYear} para ${input.targetYear}.`;
  }
}
