import { TransactionType } from '../../../../shared/types/domain';
import { SourceType } from '../../../../shared/types/domain';
import type { AssetPositionRepository } from '../../repositories/asset-position.repository';
import type { TransactionRepository } from '../../repositories/transaction.repository';
import { randomUUID } from 'node:crypto';
import { computePositionsFromTransactions } from '../../services/compute-positions-from-transactions';
import { MigrateYearOutput } from './migrate-year.output';
import { MigrateYearInput } from './migrate-year.input';
import { Transaction } from '@main/domain/portfolio/transaction.entity';



export class MigrateYearUseCase {
  constructor(
    private readonly positionRepository: AssetPositionRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly recalculatePosition: (input: {
      ticker: string;
      year: number;
    }) => Promise<void>,
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

    const sourceYearEnd = `${input.sourceYear}-12-31`;

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
    await this.transactionRepository.saveMany(targetInitialBalanceTransactions);

    const positionsAtYearEnd = await computePositionsFromTransactions(
      [...existingTargetYearTransactions, ...targetInitialBalanceTransactions],
      [],
      input.targetYear,
    );
    await this.positionRepository.saveMany(positionsAtYearEnd);
    const positionsWithQuantity = positionsAtYearEnd.filter((p) => p.totalQuantity > 0);
    if (positionsWithQuantity.length === 0) {
      return {
        migratedPositionsCount: 0,
        createdTransactionsCount: 0,
        message: `Nenhuma posição com quantidade em 31/12/${input.sourceYear}. Não há posições para migrar.`,
      };
    }

    this.positionRepository.saveMany(positionsAtYearEnd);

   
    const affectedTickers = [...new Set(positionsWithQuantity.map((p) => p.ticker))];
    for (const ticker of affectedTickers) {
      await this.recalculatePosition({ ticker, year: input.targetYear });
    }

    return {
      migratedPositionsCount: positionsWithQuantity.length,
      createdTransactionsCount: initialBalanceTransactions.length,
    };
  }

  private hasInitialBalance(existingTargetYearTransactions: Transaction[]): boolean {
    return existingTargetYearTransactions.some((transaction) => transaction.isInitialBalance());
  }

  private validateInput(input: MigrateYearInput): void {
    if (!Number.isInteger(input.sourceYear) || input.sourceYear < 2000 || input.sourceYear > 2100) {
      throw new Error('Ano de origem inválido.');
    }
    if (!Number.isInteger(input.targetYear) || input.targetYear < 2000 || input.targetYear > 2100) {
      throw new Error('Ano de destino inválido.');
    }
    if (input.targetYear !== input.sourceYear + 1) {
      throw new Error('O ano de destino deve ser exatamente o ano de origem + 1.');
    }
  }
}
