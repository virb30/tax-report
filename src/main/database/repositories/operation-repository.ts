import type { Knex } from 'knex';
import { type Operation, type OperationType, type SourceType } from '../../../shared/types/domain';

type OperationWritePayload = {
  tradeDate: string;
  operationType: OperationType;
  ticker: string;
  quantity: number;
  unitPrice: number;
  operationalCosts: number;
  irrfWithheld: number;
  broker: string;
  sourceType: SourceType;
  importedAt?: string;
  externalRef?: string;
  importBatchId?: string;
};

type PeriodOperationRecord = {
  tradeDate: string;
  operationType: OperationType;
  ticker: string;
  quantity: number;
  unitPrice: number;
  operationalCosts: number;
  irrfWithheld: number;
  broker: string;
  sourceType: SourceType;
  importedAt: string;
  externalRef: string | null;
  importBatchId: string | null;
};

type OperationRow = {
  id: number;
  trade_date: string;
  operation_type: OperationType;
  ticker: string;
  quantity: number;
  unit_price: number;
  operational_costs: number;
  irrf_withheld: number;
  broker: string;
  source_type: SourceType;
  imported_at: string;
  external_ref: string | null;
  import_batch_id: string | null;
};

export type OperationCreateInput = {
  tradeDate: string;
  operationType: OperationType;
  ticker: string;
  quantity: number;
  unitPrice: number;
  operationalCosts: number;
  irrfWithheld: number;
  broker: string;
  sourceType: SourceType;
  externalRef?: string;
  importBatchId?: string;
};

export type OperationUpdateInput = Partial<Omit<OperationCreateInput, 'ticker'>>;

function mapOperationRow(row: OperationRow): Operation {
  return {
    id: row.id,
    tradeDate: row.trade_date,
    operationType: row.operation_type,
    ticker: row.ticker,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    operationalCosts: row.operational_costs,
    irrfWithheld: row.irrf_withheld,
    broker: row.broker,
    sourceType: row.source_type,
    importedAt: row.imported_at,
    externalRef: row.external_ref,
    importBatchId: row.import_batch_id,
  };
}

function isExternalRefUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return false;
  }

  const message = String(error.message);
  return (
    message.includes('uq_operations_external_ref') || message.includes('operations.external_ref')
  );
}

export class OperationRepository {
  constructor(private readonly database: Knex) {}

  async saveMany(operations: OperationWritePayload[]): Promise<void> {
    if (operations.length === 0) {
      return;
    }

    const payload = operations.map((operation) => ({
      trade_date: operation.tradeDate,
      operation_type: operation.operationType,
      ticker: operation.ticker,
      quantity: operation.quantity,
      unit_price: operation.unitPrice,
      operational_costs: operation.operationalCosts,
      irrf_withheld: operation.irrfWithheld,
      broker: operation.broker,
      source_type: operation.sourceType,
      imported_at: operation.importedAt ?? this.database.fn.now(),
      external_ref: operation.externalRef ?? null,
      import_batch_id: operation.importBatchId ?? null,
    }));

    await this.database('operations').insert(payload);
  }

  async create(input: OperationCreateInput): Promise<Operation> {
    const [id] = await this.database('operations').insert({
      trade_date: input.tradeDate,
      operation_type: input.operationType,
      ticker: input.ticker,
      quantity: input.quantity,
      unit_price: input.unitPrice,
      operational_costs: input.operationalCosts,
      irrf_withheld: input.irrfWithheld,
      broker: input.broker,
      source_type: input.sourceType,
      external_ref: input.externalRef ?? null,
      import_batch_id: input.importBatchId ?? null,
    });

    const operation = await this.findById(Number(id));
    if (!operation) {
      throw new Error('Created operation was not found.');
    }

    return operation;
  }

  async findById(id: number): Promise<Operation | null> {
    const row = await this.database<OperationRow>('operations').where({ id }).first();
    return row ? mapOperationRow(row) : null;
  }

  async findAll(): Promise<Operation[]> {
    const rows = await this.database<OperationRow>('operations').select('*').orderBy('id', 'asc');
    return rows.map(mapOperationRow);
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Operation[]> {
    const rows = await this.database<OperationRow>('operations')
      .where('trade_date', '>=', startDate)
      .andWhere('trade_date', '<=', endDate)
      .orderBy('trade_date', 'asc')
      .orderBy('id', 'asc');

    return rows.map(mapOperationRow);
  }

  async findByExternalRef(externalRef: string): Promise<Operation | null> {
    const row = await this.database<OperationRow>('operations')
      .where({ external_ref: externalRef })
      .first();

    return row ? mapOperationRow(row) : null;
  }

  async createIfNotExists(input: OperationCreateInput & { externalRef: string }): Promise<boolean> {
    try {
      await this.create(input);
      return true;
    } catch (error: unknown) {
      if (isExternalRefUniqueConstraintError(error)) {
        return false;
      }

      throw error;
    }
  }

  async findByPeriod(input: { startDate: string; endDate: string }): Promise<PeriodOperationRecord[]> {
    return this.findByDateRange(input.startDate, input.endDate);
  }

  async findByTicker(ticker: string): Promise<Operation[]> {
    const rows = await this.database<OperationRow>('operations')
      .where({ ticker })
      .orderBy('trade_date', 'asc')
      .orderBy('id', 'asc');

    return rows.map(mapOperationRow);
  }

  async update(id: number, input: OperationUpdateInput): Promise<Operation | null> {
    const updatePayload: Record<string, unknown> = {};

    if (input.tradeDate !== undefined) {
      updatePayload.trade_date = input.tradeDate;
    }

    if (input.operationType !== undefined) {
      updatePayload.operation_type = input.operationType;
    }

    if (input.quantity !== undefined) {
      updatePayload.quantity = input.quantity;
    }

    if (input.unitPrice !== undefined) {
      updatePayload.unit_price = input.unitPrice;
    }

    if (input.operationalCosts !== undefined) {
      updatePayload.operational_costs = input.operationalCosts;
    }

    if (input.irrfWithheld !== undefined) {
      updatePayload.irrf_withheld = input.irrfWithheld;
    }

    if (input.broker !== undefined) {
      updatePayload.broker = input.broker;
    }

    if (input.sourceType !== undefined) {
      updatePayload.source_type = input.sourceType;
    }

    const affectedRows = await this.database('operations').where({ id }).update(updatePayload);
    if (affectedRows === 0) {
      return null;
    }

    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const affectedRows = await this.database('operations').where({ id }).delete();
    return affectedRows > 0;
  }
}
