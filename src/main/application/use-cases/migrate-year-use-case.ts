import type { TransactionRecord } from '../../domain/portfolio/transaction.entity';
import { TransactionType } from '../../../shared/types/domain';
import { SourceType } from '../../../shared/types/domain';
import type { PositionRepository } from '../repositories/position.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { randomUUID } from 'node:crypto';
import { computePositionsFromTransactions } from '../services/compute-positions-from-transactions';

export type MigrateYearInput = {
  sourceYear: number;
  targetYear: number;
};

export type MigrateYearResult = {
  migratedPositionsCount: number;
  createdTransactionsCount: number;
  message?: string;
};

export class MigrateYearUseCase {
  constructor(
    private readonly positionRepository: PositionRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly recalculatePosition: (input: {
      ticker: string;
      year: number;
    }) => Promise<void>,
  ) {}

  async execute(input: MigrateYearInput): Promise<MigrateYearResult> {
    this.validateInput(input);

    const targetYearStart = `${input.targetYear}-01-01`;
    const targetYearEnd = `${input.targetYear}-12-31`;
    const existingTargetYearTransactions = await this.transactionRepository.findByPeriod({
      startDate: targetYearStart,
      endDate: targetYearEnd,
    });
    const hasInitialBalanceInTargetYear = existingTargetYearTransactions.some(
      (t) => t.type === TransactionType.InitialBalance,
    );
    if (hasInitialBalanceInTargetYear) {
      throw new Error(
        `Migração duplicada: já existem transações de Saldo Inicial para o ano ${input.targetYear}. Remova-as antes de migrar novamente.`,
      );
    }

    const sourceYearEnd = `${input.sourceYear}-12-31`;
    const transactionsUntilSourceYear = await this.transactionRepository.findByPeriod({
      startDate: '0000-01-01',
      endDate: sourceYearEnd,
    });

    const positionsAtYearEnd = await computePositionsFromTransactions(
      transactionsUntilSourceYear,
      this.positionRepository,
      input.sourceYear,
    );

    const positionsWithQuantity = positionsAtYearEnd.filter((p) => p.totalQuantity > 0);
    if (positionsWithQuantity.length === 0) {
      return {
        migratedPositionsCount: 0,
        createdTransactionsCount: 0,
        message: `Nenhuma posição com quantidade em 31/12/${input.sourceYear}. Não há posições para migrar.`,
      };
    }

    const initialBalanceTransactions: TransactionRecord[] = [];
    for (const position of positionsWithQuantity) {
      for (const allocation of position.brokerBreakdown) {
        if (allocation.quantity <= 0) continue;

        initialBalanceTransactions.push({
          id: randomUUID(),
          date: targetYearStart,
          type: TransactionType.InitialBalance,
          ticker: position.ticker,
          quantity: allocation.quantity,
          unitPrice: position.averagePrice,
          fees: 0,
          brokerId: allocation.brokerId,
          sourceType: SourceType.Manual,
        });
      }
    }

    await this.transactionRepository.saveMany(initialBalanceTransactions);

    const affectedTickers = [...new Set(positionsWithQuantity.map((p) => p.ticker))];
    for (const ticker of affectedTickers) {
      await this.recalculatePosition({ ticker, year: input.targetYear });
    }

    return {
      migratedPositionsCount: positionsWithQuantity.length,
      createdTransactionsCount: initialBalanceTransactions.length,
    };
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
