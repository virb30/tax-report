import type { Knex } from 'knex';
import type {
  MonthlyTaxCloseArtifact,
  MonthlyTaxCloseRepository,
  MonthlyTaxCloseSummary,
  MonthlyTaxOutcome,
  MonthlyTaxWorkspaceState,
} from '../../application/repositories/monthly-tax-close.repository';

type MonthlyTaxCloseRow = {
  month: string;
  state: string;
  outcome: string;
  calculation_version: string;
  input_fingerprint: string;
  calculated_at: string;
  net_tax_due: string;
  carry_forward_out: string;
  change_summary: string | null;
  detail_json: string;
  created_at?: string;
  updated_at?: string;
};

type MonthlyTaxCloseSummaryRow = Omit<MonthlyTaxCloseRow, 'detail_json'>;

function toPersistence(close: MonthlyTaxCloseArtifact): MonthlyTaxCloseRow {
  return {
    month: close.month,
    state: close.state,
    outcome: close.outcome,
    calculation_version: close.calculationVersion,
    input_fingerprint: close.inputFingerprint,
    calculated_at: close.calculatedAt,
    net_tax_due: close.netTaxDue,
    carry_forward_out: close.carryForwardOut,
    change_summary: close.changeSummary,
    detail_json: JSON.stringify(close.detail),
  };
}

function toSummary(row: MonthlyTaxCloseSummaryRow): MonthlyTaxCloseSummary {
  return {
    month: row.month,
    state: row.state as MonthlyTaxWorkspaceState,
    outcome: row.outcome as MonthlyTaxOutcome,
    calculationVersion: row.calculation_version,
    inputFingerprint: row.input_fingerprint,
    calculatedAt: row.calculated_at,
    netTaxDue: row.net_tax_due,
    carryForwardOut: row.carry_forward_out,
    changeSummary: row.change_summary,
  };
}

function toArtifact(row: MonthlyTaxCloseRow): MonthlyTaxCloseArtifact {
  return {
    ...toSummary(row),
    detail: JSON.parse(row.detail_json) as unknown,
  };
}

export class KnexMonthlyTaxCloseRepository implements MonthlyTaxCloseRepository {
  constructor(private readonly database: Knex) {}

  async save(close: MonthlyTaxCloseArtifact): Promise<void> {
    const row = toPersistence(close);

    await this.database<MonthlyTaxCloseRow>('monthly_tax_closes')
      .insert(row)
      .onConflict('month')
      .merge({
        state: row.state,
        outcome: row.outcome,
        calculation_version: row.calculation_version,
        input_fingerprint: row.input_fingerprint,
        calculated_at: row.calculated_at,
        net_tax_due: row.net_tax_due,
        carry_forward_out: row.carry_forward_out,
        change_summary: row.change_summary,
        detail_json: row.detail_json,
        updated_at: this.database.fn.now(),
      });
  }

  async findHistory(): Promise<MonthlyTaxCloseSummary[]> {
    const rows = await this.database<MonthlyTaxCloseRow>('monthly_tax_closes')
      .select(
        'month',
        'state',
        'outcome',
        'calculation_version',
        'input_fingerprint',
        'calculated_at',
        'net_tax_due',
        'carry_forward_out',
        'change_summary',
      )
      .orderBy('month', 'asc');

    return rows.map(toSummary);
  }

  async findDetail(month: string): Promise<MonthlyTaxCloseArtifact | null> {
    const row = await this.database<MonthlyTaxCloseRow>('monthly_tax_closes')
      .where({ month })
      .first(
        'month',
        'state',
        'outcome',
        'calculation_version',
        'input_fingerprint',
        'calculated_at',
        'net_tax_due',
        'carry_forward_out',
        'change_summary',
        'detail_json',
      );

    return row ? toArtifact(row) : null;
  }

  async deleteFromYear(year: number): Promise<void> {
    await this.database<MonthlyTaxCloseRow>('monthly_tax_closes')
      .where('month', '>=', `${year}-01`)
      .delete();
  }
}
