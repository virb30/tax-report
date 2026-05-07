import type { Knex } from 'knex';
import { createDatabaseConnection, initializeDatabase } from '../../../app/infra/database/database';
import type { MonthlyTaxCloseArtifact } from '../../application/repositories/monthly-tax-close.repository';
import { KnexMonthlyTaxCloseRepository } from './knex-monthly-tax-close.repository';

type MonthlyTaxCloseTestRow = {
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
};

function createClose(overrides: Partial<MonthlyTaxCloseArtifact> = {}): MonthlyTaxCloseArtifact {
  return {
    month: '2026-03',
    state: 'closed',
    outcome: 'tax_due',
    calculationVersion: 'monthly-tax-v1',
    inputFingerprint: 'fingerprint-1',
    calculatedAt: '2026-05-07T10:00:00.000Z',
    netTaxDue: '25.45',
    carryForwardOut: '0',
    changeSummary: 'First monthly close',
    detail: {
      summary: {
        grossSales: '32000',
      },
      groups: [
        {
          code: 'geral-comum',
          netTaxDue: '25.45',
        },
      ],
    },
    ...overrides,
  };
}

describe('KnexMonthlyTaxCloseRepository', () => {
  let database: Knex;
  let repository: KnexMonthlyTaxCloseRepository;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, false);
    repository = new KnexMonthlyTaxCloseRepository(database);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('saves a monthly artifact with summary columns and the JSON detail payload', async () => {
    const close = createClose();

    await repository.save(close);

    const row = await database<MonthlyTaxCloseTestRow>('monthly_tax_closes')
      .where({ month: '2026-03' })
      .first();

    expect(row).toBeDefined();
    if (!row) {
      throw new Error('Expected monthly tax close row to be saved.');
    }
    expect(row).toMatchObject({
      month: '2026-03',
      state: 'closed',
      outcome: 'tax_due',
      calculation_version: 'monthly-tax-v1',
      input_fingerprint: 'fingerprint-1',
      calculated_at: '2026-05-07T10:00:00.000Z',
      net_tax_due: '25.45',
      carry_forward_out: '0',
      change_summary: 'First monthly close',
    });
    expect(JSON.parse(row.detail_json)).toEqual(close.detail);
  });

  it('overwrites the current artifact for the same month without creating duplicates', async () => {
    await repository.save(createClose());

    await repository.save(
      createClose({
        state: 'below_threshold',
        outcome: 'below_threshold',
        inputFingerprint: 'fingerprint-2',
        netTaxDue: '8.50',
        carryForwardOut: '8.50',
        changeSummary: null,
        detail: {
          summary: {
            grossSales: '15000',
          },
          carryForward: {
            out: '8.50',
          },
        },
      }),
    );

    const rows = await database('monthly_tax_closes').where({ month: '2026-03' });
    const detail = await repository.findDetail('2026-03');

    expect(rows).toHaveLength(1);
    expect(detail).toMatchObject({
      month: '2026-03',
      state: 'below_threshold',
      outcome: 'below_threshold',
      inputFingerprint: 'fingerprint-2',
      netTaxDue: '8.50',
      carryForwardOut: '8.50',
      changeSummary: null,
    });
    expect(detail?.detail).toEqual({
      summary: {
        grossSales: '15000',
      },
      carryForward: {
        out: '8.50',
      },
    });
  });

  it('returns stored month details unchanged and null for a missing month', async () => {
    const detailPayload = {
      summary: {
        outcome: 'blocked',
      },
      blockedReasons: [
        {
          code: 'daily_broker_tax',
          message: 'Missing daily broker tax',
        },
      ],
    };
    await repository.save(
      createClose({
        month: '2026-04',
        state: 'blocked',
        outcome: 'blocked',
        detail: detailPayload,
      }),
    );

    const found = await repository.findDetail('2026-04');
    const missing = await repository.findDetail('2026-05');

    expect(found?.detail).toEqual(detailPayload);
    expect(missing).toBeNull();
  });

  it('returns monthly history in chronological order without loading detail payloads', async () => {
    await repository.save(createClose({ month: '2026-03' }));
    await repository.save(
      createClose({
        month: '2026-01',
        outcome: 'no_tax',
        netTaxDue: '0',
        detail: {
          marker: 'first',
        },
      }),
    );
    await repository.save(
      createClose({
        month: '2026-02',
        outcome: 'exempt',
        netTaxDue: '0',
        detail: {
          marker: 'second',
        },
      }),
    );

    const history = await repository.findHistory();

    expect(history.map((item) => item.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(history[0]).not.toHaveProperty('detail');
  });

  it('deletes monthly artifacts from a year boundary for future recalculation', async () => {
    await repository.save(createClose({ month: '2025-12' }));
    await repository.save(createClose({ month: '2026-01' }));
    await repository.save(createClose({ month: '2026-02' }));

    await repository.deleteFromYear(2026);

    const remaining = await repository.findHistory();
    expect(remaining.map((item) => item.month)).toEqual(['2025-12']);
  });
});
