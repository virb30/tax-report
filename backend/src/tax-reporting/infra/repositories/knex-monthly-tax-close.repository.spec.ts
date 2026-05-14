import type { Knex } from 'knex';
import { createDatabaseConnection, initializeDatabase } from '../../../app/infra/database/database';
import type {
  MonthlyTaxCloseArtifact,
  MonthlyTaxCloseDetail,
} from '../../application/repositories/monthly-tax-close.repository';
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

function createDetail(overrides: Partial<MonthlyTaxCloseDetail> = {}): MonthlyTaxCloseDetail {
  return {
    summary: {
      month: '2026-03',
      state: 'closed',
      outcome: 'tax_due',
      grossSales: '32000.00',
      realizedResult: '500.00',
      taxBeforeCredits: '25.45',
      irrfCreditUsed: '0.00',
      netTaxDue: '25.45',
    },
    groups: [
      {
        code: 'geral-comum',
        label: 'Geral - Comum',
        grossSales: '32000.00',
        realizedResult: '500.00',
        carriedLossIn: '0.00',
        carriedLossOut: '0.00',
        taxableBase: '169.67',
        taxRate: '0.15',
        taxDue: '25.45',
        irrfCreditUsed: '0.00',
      },
    ],
    blockedReasons: [],
    disclosures: [],
    carryForward: {
      openingCommonLoss: '0.00',
      closingCommonLoss: '0.00',
      openingFiiLoss: '0.00',
      closingFiiLoss: '0.00',
      openingIrrfCredit: '0.00',
      closingIrrfCredit: '0.00',
      openingBelowThresholdTax: '0.00',
      closingBelowThresholdTax: '0.00',
    },
    saleLines: [],
    ...overrides,
  };
}

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
    detail: createDetail(),
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
    const replacementDetail = createDetail({
      summary: {
        ...createDetail().summary,
        grossSales: '15000.00',
        netTaxDue: '8.50',
      },
      carryForward: {
        ...createDetail().carryForward,
        closingBelowThresholdTax: '8.50',
      },
    });
    await repository.save(createClose());

    await repository.save(
      createClose({
        state: 'below_threshold',
        outcome: 'below_threshold',
        inputFingerprint: 'fingerprint-2',
        netTaxDue: '8.50',
        carryForwardOut: '8.50',
        changeSummary: null,
        detail: replacementDetail,
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
    expect(detail?.detail).toEqual(replacementDetail);
  });

  it('returns stored month details unchanged and null for a missing month', async () => {
    const detailPayload = createDetail({
      summary: {
        ...createDetail().summary,
        state: 'blocked',
        outcome: 'blocked',
      },
      blockedReasons: [
        {
          code: 'missing_daily_broker_tax',
          message: 'Missing daily broker tax',
        },
      ],
    });
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

  it('normalizes legacy sale lines by returning backend-derived net sale values', async () => {
    const legacyDetail = createDetail({
      saleLines: [
        {
          id: 'sale-1',
          date: '2026-04-10',
          ticker: 'PETR4',
          brokerId: 'broker-xp',
          groupCode: 'geral-comum',
          assetClass: 'stock',
          quantity: '100',
          grossAmount: '25000.00',
          costBasis: '24000.00',
          fees: '12.34',
          realizedResult: '987.66',
          allocatedIrrf: '10.00',
        } as MonthlyTaxCloseDetail['saleLines'][number],
      ],
    });
    await repository.save(
      createClose({
        month: '2026-04',
        detail: legacyDetail,
      }),
    );
    await database('monthly_tax_closes')
      .where({ month: '2026-04' })
      .update({
        detail_json: JSON.stringify({
          ...legacyDetail,
          saleLines: legacyDetail.saleLines.map((line) => {
            const legacyLine = { ...line } as Partial<MonthlyTaxCloseDetail['saleLines'][number]>;
            delete legacyLine.netSaleValue;

            return legacyLine;
          }),
        }),
      });

    const found = await repository.findDetail('2026-04');

    expect(found?.detail.saleLines[0]).toMatchObject({
      grossAmount: '25000.00',
      fees: '12.34',
      netSaleValue: '24987.66',
    });
  });

  it('returns monthly history in chronological order without loading detail payloads', async () => {
    await repository.save(createClose({ month: '2026-03' }));
    await repository.save(
      createClose({
        month: '2026-01',
        outcome: 'no_tax',
        netTaxDue: '0',
        detail: createDetail(),
      }),
    );
    await repository.save(
      createClose({
        month: '2026-02',
        outcome: 'exempt',
        netTaxDue: '0',
        detail: createDetail(),
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
