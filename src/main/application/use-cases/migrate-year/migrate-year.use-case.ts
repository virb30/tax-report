import { TransactionType } from '../../../../shared/types/domain';
import { SourceType } from '../../../../shared/types/domain';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import type { MigrateYearOutput } from './migrate-year.output';
import type { MigrateYearInput } from './migrate-year.input';
import { Transaction } from '../../../domain/portfolio/entities/transaction.entity';
import { PositionCalculatorService } from '../../../domain/portfolio/services/position-calculator.service';
import { assertSupportedYear } from '../../../../shared/utils/year';

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

    if (this.hasInitialBalance(existingTargetYearTransactions)) {
      throw new Error(
        `Migração duplicada: já existem transações de Saldo Inicial para o ano ${input.targetYear}. Remova-as antes de migrar novamente.`,
      );
    }

    const sourceYearPositions = await this.positionRepository.findAllByYear(input.sourceYear);
    const targetInitialBalanceTransactions: Transaction[] = [];
    sourceYearPositions.forEach((position) => {
      position.brokerBreakdown.forEach((broker) => {
        if (broker.quantity <= 0) return;
        const transaction = Transaction.create({
          type: TransactionType.InitialBalance,
          date: targetYearStart,
          ticker: position.ticker,
          quantity: broker.quantity,
          unitPrice: position.averagePrice,
          fees: 0,
          brokerId: broker.brokerId,
          sourceType: SourceType.Manual,
        });
        targetInitialBalanceTransactions.push(transaction);
      });
    });

    const positionCalculator = new PositionCalculatorService();
    const positionsAtYearEnd = positionCalculator.compute(
      [...existingTargetYearTransactions, ...targetInitialBalanceTransactions],
      [],
      input.targetYear,
    );

    const positionsWithQuantity = positionsAtYearEnd.filter((p) => p.totalQuantity > 0);

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

  private hasInitialBalance(existingTargetYearTransactions: Transaction[]): boolean {
    return existingTargetYearTransactions.some((transaction) => transaction.isInitialBalance());
  }

  private validateInput(input: MigrateYearInput): void {
    assertSupportedYear(input.sourceYear, { invalidTypeMessage: 'Ano de origem inválido.' });
    assertSupportedYear(input.targetYear, { invalidTypeMessage: 'Ano de destino inválido.' });
    if (input.targetYear !== input.sourceYear + 1) {
      throw new Error('O ano de destino deve ser exatamente o ano de origem + 1.');
    }
  }
}
